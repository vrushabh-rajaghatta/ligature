

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { DocumentCrossReference, CrossReferenceType, CrossReferenceGroup } from '@/utils/document-converters';

// ============================================================================
// SAMPLE CROSS-REFERENCES (Golden Path Data)
// ============================================================================

const sampleCrossReferences: DocumentCrossReference[] = [
  // CSR references Protocol
  {
    id: 'xref-001',
    sourceDocumentId: 'doc-csr-lig301',
    sourceDocumentTitle: 'CSR LIG-301 Phase 3',
    sourceSectionId: 'sec-methods',
    sourceSectionTitle: 'Study Methods',
    targetDocumentId: 'doc-protocol-lig301',
    targetDocumentTitle: 'Protocol LIG-301-001 v3.0',
    targetSectionId: 'sec-study-design',
    targetSectionTitle: 'Study Design',
    referenceType: 'derived-from',
    referenceText: 'Study conducted per Protocol LIG-301-001 v3.0',
    createdAt: '2024-12-01T10:00:00Z',
    createdBy: 'Dr. Sarah Chen',
    isValid: true,
    lastValidated: '2024-12-15T10:00:00Z',
  },
  // CSR references IB
  {
    id: 'xref-002',
    sourceDocumentId: 'doc-csr-lig301',
    sourceDocumentTitle: 'CSR LIG-301 Phase 3',
    sourceSectionId: 'sec-intro',
    sourceSectionTitle: 'Introduction',
    targetDocumentId: 'doc-ib-nexavant',
    targetDocumentTitle: 'Investigator Brochure Nexavant v8.0',
    targetSectionId: 'sec-preclinical',
    targetSectionTitle: 'Preclinical Data',
    referenceType: 'cites',
    referenceText: 'Preclinical efficacy data (IB Section 4)',
    createdAt: '2024-11-15T14:00:00Z',
    createdBy: 'Dr. Sarah Chen',
    isValid: true,
    lastValidated: '2024-12-15T10:00:00Z',
  },
  // Module 2.7 references CSR
  {
    id: 'xref-003',
    sourceDocumentId: 'doc-m27-nexavant',
    sourceDocumentTitle: 'Module 2.7 Clinical Summary',
    sourceSectionId: 'sec-efficacy',
    sourceSectionTitle: 'Efficacy Results',
    targetDocumentId: 'doc-csr-lig301',
    targetDocumentTitle: 'CSR LIG-301 Phase 3',
    targetSectionId: 'sec-results',
    targetSectionTitle: 'Results',
    referenceType: 'references',
    referenceText: 'See CSR LIG-301 Section 11 for detailed efficacy analysis',
    createdAt: '2024-12-10T09:00:00Z',
    createdBy: 'Dr. James Liu',
    isValid: true,
    lastValidated: '2024-12-15T10:00:00Z',
  },
  // Protocol v3 supersedes v2
  {
    id: 'xref-004',
    sourceDocumentId: 'doc-protocol-lig301',
    sourceDocumentTitle: 'Protocol LIG-301-001 v3.0',
    targetDocumentId: 'doc-protocol-lig301-v2',
    targetDocumentTitle: 'Protocol LIG-301-001 v2.0',
    referenceType: 'supersedes',
    referenceText: 'Version 3.0 supersedes Version 2.0 (Amendment 2)',
    createdAt: '2024-09-01T08:00:00Z',
    createdBy: 'Dr. Maria Garcia',
    isValid: true,
    lastValidated: '2024-12-01T10:00:00Z',
  },
  // CSR supports Module 2.5
  {
    id: 'xref-005',
    sourceDocumentId: 'doc-csr-lig301',
    sourceDocumentTitle: 'CSR LIG-301 Phase 3',
    targetDocumentId: 'doc-m25-nexavant',
    targetDocumentTitle: 'Module 2.5 Clinical Overview',
    referenceType: 'supports',
    referenceText: 'Primary efficacy evidence for Clinical Overview',
    createdAt: '2024-12-12T11:00:00Z',
    createdBy: 'Dr. Sarah Chen',
    isValid: true,
    lastValidated: '2024-12-15T10:00:00Z',
  },
  // IB cites Preclinical Reports
  {
    id: 'xref-006',
    sourceDocumentId: 'doc-ib-nexavant',
    sourceDocumentTitle: 'Investigator Brochure Nexavant v8.0',
    sourceSectionId: 'sec-tox',
    sourceSectionTitle: 'Toxicology',
    targetDocumentId: 'doc-tox-lig2847',
    targetDocumentTitle: 'Nonclinical Toxicology Report LIG-2847',
    referenceType: 'cites',
    referenceText: 'Complete toxicology findings',
    createdAt: '2024-08-15T16:00:00Z',
    createdBy: 'Dr. Robert Kim',
    isValid: true,
    lastValidated: '2024-12-01T10:00:00Z',
  },
  // DSUR references IB
  {
    id: 'xref-007',
    sourceDocumentId: 'doc-dsur-nexavant-2024',
    sourceDocumentTitle: 'DSUR Nexavant 2024',
    targetDocumentId: 'doc-ib-nexavant',
    targetDocumentTitle: 'Investigator Brochure Nexavant v8.0',
    referenceType: 'see-also',
    referenceText: 'Current approved safety information',
    createdAt: '2024-12-01T10:00:00Z',
    createdBy: 'Dr. Lisa Wong',
    isValid: true,
    lastValidated: '2024-12-15T10:00:00Z',
  },
  // CSR has IB as prerequisite
  {
    id: 'xref-008',
    sourceDocumentId: 'doc-csr-lig301',
    sourceDocumentTitle: 'CSR LIG-301 Phase 3',
    targetDocumentId: 'doc-ib-nexavant',
    targetDocumentTitle: 'Investigator Brochure Nexavant v8.0',
    referenceType: 'prerequisite',
    referenceText: 'IB must be updated before CSR finalization',
    createdAt: '2024-11-01T10:00:00Z',
    createdBy: 'Dr. Sarah Chen',
    isValid: true,
    lastValidated: '2024-12-15T10:00:00Z',
  },
];

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface CrossReferenceState {
  // Data
  references: DocumentCrossReference[];
  
  // UI State
  selectedReferenceId: string | null;
  showCreateDialog: boolean;
  filterType: CrossReferenceType | 'all';
  searchQuery: string;
  
  // Actions
  addReference: (ref: Omit<DocumentCrossReference, 'id' | 'createdAt' | 'isValid'>) => void;
  updateReference: (id: string, updates: Partial<DocumentCrossReference>) => void;
  deleteReference: (id: string) => void;
  validateReference: (id: string) => void;
  
  // Queries
  getReferencesForDocument: (documentId: string) => CrossReferenceGroup;
  getOutgoingReferences: (documentId: string) => DocumentCrossReference[];
  getIncomingReferences: (documentId: string) => DocumentCrossReference[];
  getReferencesByType: (type: CrossReferenceType) => DocumentCrossReference[];
  
  // UI Actions
  setSelectedReference: (id: string | null) => void;
  setShowCreateDialog: (show: boolean) => void;
  setFilterType: (type: CrossReferenceType | 'all') => void;
  setSearchQuery: (query: string) => void;
  
  // Bulk operations
  validateAllReferences: () => void;
  exportReferences: () => string;
}

// ============================================================================
// STORE
// ============================================================================

export const useCrossReferenceStore = create<CrossReferenceState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial data
        references: sampleCrossReferences,
        
        // UI State
        selectedReferenceId: null,
        showCreateDialog: false,
        filterType: 'all',
        searchQuery: '',
        
        // Actions
        addReference: (ref) => {
          const newRef: DocumentCrossReference = {
            ...ref,
            id: `xref-${Date.now()}`,
            createdAt: new Date().toISOString(),
            isValid: true,
            lastValidated: new Date().toISOString(),
          };
          set(state => ({
            references: [...state.references, newRef],
          }));
        },
        
        updateReference: (id, updates) => {
          set(state => ({
            references: state.references.map(ref =>
              ref.id === id ? { ...ref, ...updates } : ref
            ),
          }));
        },
        
        deleteReference: (id) => {
          set(state => ({
            references: state.references.filter(ref => ref.id !== id),
          }));
        },
        
        validateReference: (id) => {
          // In real implementation, this would check if target document exists
          set(state => ({
            references: state.references.map(ref =>
              ref.id === id
                ? { ...ref, isValid: true, lastValidated: new Date().toISOString() }
                : ref
            ),
          }));
        },
        
        // Queries
        getReferencesForDocument: (documentId) => {
          const { references } = get();
          const outgoing = references.filter(r => r.sourceDocumentId === documentId);
          const incoming = references.filter(r => r.targetDocumentId === documentId);
          
          const doc = outgoing[0] || incoming[0];
          return {
            documentId,
            documentTitle: doc?.sourceDocumentTitle || doc?.targetDocumentTitle || 'Unknown Document',
            outgoingReferences: outgoing,
            incomingReferences: incoming,
          };
        },
        
        getOutgoingReferences: (documentId) => {
          return get().references.filter(r => r.sourceDocumentId === documentId);
        },
        
        getIncomingReferences: (documentId) => {
          return get().references.filter(r => r.targetDocumentId === documentId);
        },
        
        getReferencesByType: (type) => {
          return get().references.filter(r => r.referenceType === type);
        },
        
        // UI Actions
        setSelectedReference: (id) => set({ selectedReferenceId: id }),
        setShowCreateDialog: (show) => set({ showCreateDialog: show }),
        setFilterType: (type) => set({ filterType: type }),
        setSearchQuery: (query) => set({ searchQuery: query }),
        
        // Bulk operations
        validateAllReferences: () => {
          const now = new Date().toISOString();
          set(state => ({
            references: state.references.map(ref => ({
              ...ref,
              isValid: true,
              lastValidated: now,
            })),
          }));
        },
        
        exportReferences: () => {
          const { references } = get();
          return JSON.stringify(references, null, 2);
        },
      }),
      { name: 'CrossReferenceStore' }
    ),
    { name: 'CrossReferenceStore' }
  )
);

export default useCrossReferenceStore;
