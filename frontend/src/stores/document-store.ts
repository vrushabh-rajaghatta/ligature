

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type CTDModule = 'm1' | 'm2' | 'm3' | 'm4' | 'm5';
export type DocumentStatus = 'draft' | 'in-review' | 'qc-pending' | 'qc-passed' | 'qc-failed' | 'approved' | 'final';
export type DocumentType = 'form' | 'cover-letter' | 'protocol' | 'csr' | 'summary' | 'specification' | 'labeling' | 'correspondence' | 'other';
export type FileFormat = 'pdf' | 'xml' | 'docx' | 'xlsx';
export type QCCheckResult = 'pass' | 'fail' | 'warning' | 'not-run';

export interface CTDDocument {
  id: string;
  applicationId: string;
  sequenceId?: string;
  module: CTDModule;
  section: string;
  ctdTitle: string;
  title: string;
  fileName: string;
  documentType: DocumentType;
  fileFormat: FileFormat;
  fileSize?: number;
  pageCount?: number;
  status: DocumentStatus;
  version: string;
  author?: string;
  reviewer?: string;
  approver?: string;
  operation?: 'new' | 'replace' | 'append' | 'delete';
  qcResults?: QCCheckResult[];
  qcCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: string;
  changeDescription?: string;
  createdAt: string;
}

export interface QCRun {
  id: string;
  documentId: string;
  runAt: string;
  runBy?: string;
  results: { checkId: string; result: QCCheckResult; message?: string }[];
  overallResult: QCCheckResult;
}

export const CTD_SECTIONS: Record<CTDModule, { title: string; sections: { code: string; title: string }[] }> = {
  m1: { title: 'Administrative Information', sections: [{ code: '1.1', title: 'Forms' }, { code: '1.2', title: 'Cover Letter' }] },
  m2: { title: 'CTD Summaries', sections: [{ code: '2.5', title: 'Clinical Overview' }, { code: '2.7', title: 'Clinical Summary' }] },
  m3: { title: 'Quality', sections: [{ code: '3.2.S', title: 'Drug Substance' }, { code: '3.2.P', title: 'Drug Product' }] },
  m4: { title: 'Nonclinical Study Reports', sections: [{ code: '4.2.1', title: 'Pharmacology' }, { code: '4.2.3', title: 'Toxicology' }] },
  m5: { title: 'Clinical Study Reports', sections: [{ code: '5.3.5', title: 'Efficacy and Safety Studies' }] },
};

const generateId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const timestamp = (): string => new Date().toISOString();

const computeOverallQCResult = (results: QCRun['results']): QCCheckResult => {
  if (results.some(r => r.result === 'fail')) return 'fail';
  if (results.some(r => r.result === 'warning')) return 'warning';
  if (results.every(r => r.result === 'pass')) return 'pass';
  return 'not-run';
};

// API response mappers
const mapCtdSection = (section: string | undefined): CTDModule => {
  if (!section) return 'm1';
  if (section.startsWith('1') || section.startsWith('m1')) return 'm1';
  if (section.startsWith('2') || section.startsWith('m2')) return 'm2';
  if (section.startsWith('3') || section.startsWith('m3')) return 'm3';
  if (section.startsWith('4') || section.startsWith('m4')) return 'm4';
  if (section.startsWith('5') || section.startsWith('m5')) return 'm5';
  return 'm1';
};

const mapDocType = (type: string | undefined): DocumentType => {
  const typeMap: Record<string, DocumentType> = {
    'Protocol': 'protocol',
    'CSR': 'csr',
    'Clinical Study Report': 'csr',
    'Form': 'form',
    'Cover Letter': 'cover-letter',
    'Summary': 'summary',
    'Specification': 'specification',
    'Labeling': 'labeling',
    'Module 2': 'summary',
    'Module 3': 'specification',
  };
  return typeMap[type || ''] || 'other';
};

const mapDocStatus = (status: string | undefined): DocumentStatus => {
  const statusMap: Record<string, DocumentStatus> = {
    'Draft': 'draft',
    'In Review': 'in-review',
    'Approved': 'approved',
    'Effective': 'final',
    'Superseded': 'final',
    'Obsolete': 'final',
  };
  return statusMap[status || ''] || 'draft';
};

const defaultDocuments: CTDDocument[] = [
  { id: 'doc-001', applicationId: 'app-002', sequenceId: 'seq-001', module: 'm1', section: '1.1', ctdTitle: 'FDA Form 356h', title: 'Application Form 356h', fileName: 'm1-1-fda-form-356h.pdf', documentType: 'form', fileFormat: 'pdf', fileSize: 245000, pageCount: 4, status: 'final', version: '1.0', author: 'Jennifer Walsh', createdAt: '2024-06-10T00:00:00Z', updatedAt: '2024-06-14T00:00:00Z' },
  { id: 'doc-002', applicationId: 'app-002', sequenceId: 'seq-001', module: 'm2', section: '2.5', ctdTitle: 'Clinical Overview', title: 'Clinical Overview - LIG-2847', fileName: 'm2-5-clinical-overview.pdf', documentType: 'summary', fileFormat: 'pdf', fileSize: 1850000, pageCount: 95, status: 'final', version: '1.0', author: 'Dr. James Wilson', createdAt: '2024-04-01T00:00:00Z', updatedAt: '2024-06-14T00:00:00Z' },
  { id: 'doc-003', applicationId: 'app-002', sequenceId: 'seq-001', module: 'm1', section: '1.2', ctdTitle: 'Cover Letter', title: 'NDA Cover Letter', fileName: 'm1-2-cover-letter.pdf', documentType: 'cover-letter', fileFormat: 'pdf', fileSize: 125000, pageCount: 2, status: 'final', version: '1.0', author: 'Jennifer Walsh', createdAt: '2024-06-12T00:00:00Z', updatedAt: '2024-06-14T00:00:00Z' },
  { id: 'doc-004', applicationId: 'app-002', sequenceId: 'seq-001', module: 'm2', section: '2.7', ctdTitle: 'Clinical Summary', title: 'Clinical Summary - LIG-2847', fileName: 'm2-7-clinical-summary.pdf', documentType: 'summary', fileFormat: 'pdf', fileSize: 3200000, pageCount: 180, status: 'final', version: '1.0', author: 'Dr. James Wilson', createdAt: '2024-03-15T00:00:00Z', updatedAt: '2024-06-14T00:00:00Z' },
  { id: 'doc-005', applicationId: 'app-002', sequenceId: 'seq-001', module: 'm3', section: '3.2.S', ctdTitle: 'Drug Substance', title: 'Drug Substance - Ligrastinib', fileName: 'm3-2s-drug-substance.pdf', documentType: 'specification', fileFormat: 'pdf', fileSize: 4500000, pageCount: 250, status: 'final', version: '1.0', author: 'Sarah Chen', createdAt: '2024-02-01T00:00:00Z', updatedAt: '2024-06-14T00:00:00Z' },
  { id: 'doc-006', applicationId: 'app-002', sequenceId: 'seq-001', module: 'm3', section: '3.2.P', ctdTitle: 'Drug Product', title: 'Drug Product - Nexavant Tablets', fileName: 'm3-2p-drug-product.pdf', documentType: 'specification', fileFormat: 'pdf', fileSize: 3800000, pageCount: 220, status: 'final', version: '1.0', author: 'Sarah Chen', createdAt: '2024-02-15T00:00:00Z', updatedAt: '2024-06-14T00:00:00Z' },
  { id: 'doc-007', applicationId: 'app-002', sequenceId: 'seq-001', module: 'm5', section: '5.3.5', ctdTitle: 'Clinical Study Report', title: 'CSR Study LIG-2847-301', fileName: 'm5-3-5-csr-301.pdf', documentType: 'csr', fileFormat: 'pdf', fileSize: 15000000, pageCount: 850, status: 'final', version: '1.0', author: 'Dr. Maria Garcia', createdAt: '2024-01-15T00:00:00Z', updatedAt: '2024-06-14T00:00:00Z' },
  { id: 'doc-008', applicationId: 'app-002', sequenceId: 'seq-002', module: 'm3', section: '3.2.P', ctdTitle: 'Drug Product - Updated', title: 'Drug Product Stability Update', fileName: 'm3-2p-stability-update.pdf', documentType: 'specification', fileFormat: 'pdf', fileSize: 980000, pageCount: 45, status: 'final', version: '1.0', author: 'Sarah Chen', operation: 'append', createdAt: '2024-09-10T00:00:00Z', updatedAt: '2024-09-14T00:00:00Z' },
  { id: 'doc-009', applicationId: 'app-002', sequenceId: 'seq-003', module: 'm2', section: '2.5', ctdTitle: 'Clinical Overview - Amendment', title: 'Clinical Overview Amendment - Safety Update', fileName: 'm2-5-clinical-overview-amend.pdf', documentType: 'summary', fileFormat: 'pdf', fileSize: 450000, pageCount: 25, status: 'draft', version: '0.1', author: 'Dr. James Wilson', operation: 'replace', createdAt: '2024-12-05T00:00:00Z', updatedAt: '2024-12-10T00:00:00Z' },
  { id: 'doc-010', applicationId: 'app-002', sequenceId: 'seq-003', module: 'm1', section: '1.2', ctdTitle: 'Cover Letter', title: 'IR Response Cover Letter', fileName: 'm1-2-ir-cover-letter.pdf', documentType: 'cover-letter', fileFormat: 'pdf', status: 'in-review', version: '0.2', author: 'Jennifer Walsh', createdAt: '2024-12-08T00:00:00Z', updatedAt: '2024-12-12T00:00:00Z' },
  // LIG-1182 (Oncorix) BLA Documents (app-004)
  { id: 'doc-011', applicationId: 'app-004', sequenceId: 'seq-011', module: 'm1', section: '1.1', ctdTitle: 'FDA Form 356h', title: 'BLA Application Form', fileName: 'm1-1-fda-form-356h.pdf', documentType: 'form', fileFormat: 'pdf', fileSize: 258000, pageCount: 5, status: 'final', version: '1.0', author: 'Michael Rodriguez', createdAt: '2024-08-10T00:00:00Z', updatedAt: '2024-08-14T00:00:00Z' },
  { id: 'doc-012', applicationId: 'app-004', sequenceId: 'seq-011', module: 'm1', section: '1.2', ctdTitle: 'Cover Letter', title: 'BLA Cover Letter - Oncorix', fileName: 'm1-2-cover-letter.pdf', documentType: 'cover-letter', fileFormat: 'pdf', fileSize: 145000, pageCount: 3, status: 'final', version: '1.0', author: 'Michael Rodriguez', createdAt: '2024-08-12T00:00:00Z', updatedAt: '2024-08-14T00:00:00Z' },
  { id: 'doc-013', applicationId: 'app-004', sequenceId: 'seq-011', module: 'm2', section: '2.5', ctdTitle: 'Clinical Overview', title: 'Clinical Overview - LIG-1182', fileName: 'm2-5-clinical-overview.pdf', documentType: 'summary', fileFormat: 'pdf', fileSize: 2450000, pageCount: 125, status: 'final', version: '1.0', author: 'Dr. Amanda Foster', createdAt: '2024-06-01T00:00:00Z', updatedAt: '2024-08-14T00:00:00Z' },
  { id: 'doc-014', applicationId: 'app-004', sequenceId: 'seq-011', module: 'm2', section: '2.7', ctdTitle: 'Clinical Summary', title: 'Clinical Summary - LIG-1182', fileName: 'm2-7-clinical-summary.pdf', documentType: 'summary', fileFormat: 'pdf', fileSize: 4200000, pageCount: 245, status: 'final', version: '1.0', author: 'Dr. Amanda Foster', createdAt: '2024-05-15T00:00:00Z', updatedAt: '2024-08-14T00:00:00Z' },
  { id: 'doc-015', applicationId: 'app-004', sequenceId: 'seq-011', module: 'm3', section: '3.2.S', ctdTitle: 'Drug Substance', title: 'Drug Substance - Ligamab', fileName: 'm3-2s-drug-substance.pdf', documentType: 'specification', fileFormat: 'pdf', fileSize: 6800000, pageCount: 380, status: 'final', version: '1.0', author: 'David Kim', createdAt: '2024-04-01T00:00:00Z', updatedAt: '2024-08-14T00:00:00Z' },
  { id: 'doc-016', applicationId: 'app-004', sequenceId: 'seq-011', module: 'm3', section: '3.2.P', ctdTitle: 'Drug Product', title: 'Drug Product - Oncorix IV', fileName: 'm3-2p-drug-product.pdf', documentType: 'specification', fileFormat: 'pdf', fileSize: 5200000, pageCount: 295, status: 'final', version: '1.0', author: 'David Kim', createdAt: '2024-04-15T00:00:00Z', updatedAt: '2024-08-14T00:00:00Z' },
  { id: 'doc-017', applicationId: 'app-004', sequenceId: 'seq-011', module: 'm5', section: '5.3.5', ctdTitle: 'Clinical Study Report', title: 'CSR Study LIG-1182-301 (ONCOHER-3)', fileName: 'm5-3-5-csr-301.pdf', documentType: 'csr', fileFormat: 'pdf', fileSize: 22000000, pageCount: 1150, status: 'final', version: '1.0', author: 'Dr. Amanda Foster', createdAt: '2024-03-01T00:00:00Z', updatedAt: '2024-08-14T00:00:00Z' },
  { id: 'doc-018', applicationId: 'app-004', sequenceId: 'seq-011', module: 'm5', section: '5.3.5', ctdTitle: 'Clinical Study Report', title: 'CSR Study LIG-1182-201 (Phase 2)', fileName: 'm5-3-5-csr-201.pdf', documentType: 'csr', fileFormat: 'pdf', fileSize: 12500000, pageCount: 680, status: 'final', version: '1.0', author: 'Dr. Amanda Foster', createdAt: '2024-02-15T00:00:00Z', updatedAt: '2024-08-14T00:00:00Z' },
  { id: 'doc-019', applicationId: 'app-004', sequenceId: 'seq-012', module: 'm3', section: '3.2.P', ctdTitle: 'Drug Product - Amendment', title: 'Manufacturing Process Update', fileName: 'm3-2p-mfg-update.pdf', documentType: 'specification', fileFormat: 'pdf', fileSize: 1200000, pageCount: 65, status: 'final', version: '1.0', author: 'David Kim', operation: 'append', createdAt: '2024-10-25T00:00:00Z', updatedAt: '2024-10-30T00:00:00Z' },
  { id: 'doc-020', applicationId: 'app-004', sequenceId: 'seq-013', module: 'm1', section: '1.2', ctdTitle: 'Cover Letter', title: 'IR Response Cover Letter - Manufacturing', fileName: 'm1-2-ir-mfg-cover.pdf', documentType: 'cover-letter', fileFormat: 'pdf', status: 'draft', version: '0.1', author: 'Michael Rodriguez', createdAt: '2024-12-10T00:00:00Z', updatedAt: '2024-12-12T00:00:00Z' },
  // LIG-1182 MAA Documents (app-005)
  { id: 'doc-021', applicationId: 'app-005', sequenceId: 'seq-014', module: 'm1', section: '1.2', ctdTitle: 'Cover Letter', title: 'MAA Cover Letter - Oncorix', fileName: 'm1-2-cover-letter.pdf', documentType: 'cover-letter', fileFormat: 'pdf', fileSize: 160000, pageCount: 4, status: 'final', version: '1.0', author: 'Elena Vasquez', createdAt: '2024-08-28T00:00:00Z', updatedAt: '2024-08-31T00:00:00Z' },
  { id: 'doc-022', applicationId: 'app-005', sequenceId: 'seq-014', module: 'm2', section: '2.5', ctdTitle: 'Clinical Overview', title: 'Clinical Overview - Oncorix (EU)', fileName: 'm2-5-clinical-overview-eu.pdf', documentType: 'summary', fileFormat: 'pdf', fileSize: 2550000, pageCount: 132, status: 'final', version: '1.0', author: 'Dr. Amanda Foster', createdAt: '2024-07-15T00:00:00Z', updatedAt: '2024-08-31T00:00:00Z' },
  { id: 'doc-023', applicationId: 'app-005', sequenceId: 'seq-015', module: 'm2', section: '2.7', ctdTitle: 'Clinical Summary - Update', title: 'Clinical Summary Amendment', fileName: 'm2-7-clinical-summary-update.pdf', documentType: 'summary', fileFormat: 'pdf', fileSize: 1800000, pageCount: 95, status: 'qc-pending', version: '0.3', author: 'Dr. Amanda Foster', operation: 'replace', createdAt: '2024-12-01T00:00:00Z', updatedAt: '2024-12-14T00:00:00Z' },
];

interface DocumentState {
  documents: CTDDocument[];
  versions: DocumentVersion[];
  qcRuns: QCRun[];
  selectedDocumentId: string | null;
  isLoading: boolean;
  uploadProgress: number | null;
  lastSynced: string | null;
  syncError: string | null;
  
  // Sync actions (call API)
  fetchDocuments: (applicationId?: string) => Promise<void>;
  syncDocument: (id: string) => Promise<void>;
  createDocumentAsync: (doc: Omit<CTDDocument, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateDocumentAsync: (id: string, updates: Partial<CTDDocument>) => Promise<void>;
  deleteDocumentAsync: (id: string) => Promise<void>;
  
  // Local actions (immediate, for optimistic updates)
  addDocument: (doc: Omit<CTDDocument, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateDocument: (id: string, updates: Partial<CTDDocument>) => void;
  deleteDocument: (id: string) => void;
  getDocument: (id: string) => CTDDocument | undefined;
  getDocumentsForApplication: (applicationId: string) => CTDDocument[];
  getDocumentsForSequence: (sequenceId: string) => CTDDocument[];
  getDocumentsByModule: (applicationId: string, module: CTDModule) => CTDDocument[];
  getDocumentsBySection: (applicationId: string, section: string) => CTDDocument[];
  createVersion: (documentId: string, changeDescription?: string) => string;
  getVersionHistory: (documentId: string) => DocumentVersion[];
  recordQCRun: (documentId: string, results: QCRun['results'], runBy?: string) => string;
  getLatestQCRun: (documentId: string) => QCRun | undefined;
  getQCHistory: (documentId: string) => QCRun[];
  submitForReview: (id: string) => void;
  approveDocument: (id: string, approver: string) => void;
  rejectDocument: (id: string, reason: string) => void;
  finalizeDocument: (id: string) => void;
  assignToSequence: (documentId: string, sequenceId: string) => void;
  unassignFromSequence: (documentId: string) => void;
  selectDocument: (id: string | null) => void;
  importDocuments: (docs: CTDDocument[]) => void;
  exportDocuments: (applicationId?: string) => CTDDocument[];
  clearAll: () => void;
}

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set, get) => ({
      documents: defaultDocuments,
      versions: [],
      qcRuns: [],
      selectedDocumentId: null,
      isLoading: false,
      uploadProgress: null,
      lastSynced: null,
      syncError: null,

      // =========================================================================
      // ASYNC API ACTIONS
      // =========================================================================
      
      fetchDocuments: async (applicationId) => {
        set({ isLoading: true, syncError: null });
        try {
          const params = new URLSearchParams();
          if (applicationId) params.set('productId', applicationId);
          
          const response = await fetch(`/api/documents?${params.toString()}`);
          if (!response.ok) throw new Error('Failed to fetch documents');
          
          const result = await response.json();
          
          if (result.data && Array.isArray(result.data)) {
            // Map API response to CTDDocument format
            const apiDocs: CTDDocument[] = result.data.map((d: Record<string, unknown>) => ({
              id: d.id as string,
              applicationId: (d.productId as string) || 'app-002',
              sequenceId: d.submissionId as string | undefined,
              module: mapCtdSection(d.ectdSection as string || d.ectdModule as string),
              section: (d.ectdSection as string) || '1.1',
              ctdTitle: (d.title as string) || '',
              title: d.title as string,
              fileName: (d.filePath as string)?.split('/').pop() || `${d.documentNumber}.pdf`,
              documentType: mapDocType(d.type as string),
              fileFormat: 'pdf' as FileFormat,
              fileSize: d.fileSize as number | undefined,
              pageCount: d.pageCount as number | undefined,
              status: mapDocStatus(d.status as string),
              version: (d.version as string) || '1.0',
              author: d.ownerName as string | undefined,
              createdAt: d.createdAt as string,
              updatedAt: d.updatedAt as string,
            }));
            
            // Merge with local documents (keep local ones not in API)
            const localOnlyDocs = get().documents.filter(
              local => !apiDocs.some(api => api.id === local.id)
            );
            
            set({ 
              documents: [...apiDocs, ...localOnlyDocs],
              lastSynced: new Date().toISOString(),
              isLoading: false 
            });
          }
        } catch (error) {
          console.error('[DocumentStore] Fetch error:', error);
          set({ syncError: (error as Error).message, isLoading: false });
        }
      },
      
      syncDocument: async (id) => {
        const doc = get().getDocument(id);
        if (!doc) return;
        
        try {
          const response = await fetch(`/api/documents/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: doc.title,
              status: doc.status,
              version: doc.version,
            }),
          });
          
          if (!response.ok) throw new Error('Failed to sync document');
          set({ lastSynced: new Date().toISOString() });
        } catch (error) {
          console.error('[DocumentStore] Sync error:', error);
          set({ syncError: (error as Error).message });
        }
      },
      
      createDocumentAsync: async (docData) => {
        // Optimistic update
        const localId = get().addDocument(docData);
        
        try {
          const response = await fetch('/api/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: docData.title,
              type: docData.documentType,
              ectdModule: docData.module,
              ectdSection: docData.section,
              productId: docData.applicationId,
              version: docData.version,
            }),
          });
          
          if (!response.ok) throw new Error('Failed to create document');
          
          const result = await response.json();
          
          // Update local doc with server ID if different
          if (result.data?.id && result.data.id !== localId) {
            set((s) => ({
              documents: s.documents.map((d) => 
                d.id === localId ? { ...d, id: result.data.id } : d
              ),
            }));
            return result.data.id;
          }
          
          return localId;
        } catch (error) {
          console.error('[DocumentStore] Create error:', error);
          set({ syncError: (error as Error).message });
          return localId; // Return local ID even if API fails
        }
      },
      
      updateDocumentAsync: async (id, updates) => {
        // Optimistic update
        get().updateDocument(id, updates);
        
        try {
          const response = await fetch(`/api/documents/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });
          
          if (!response.ok) throw new Error('Failed to update document');
          set({ lastSynced: new Date().toISOString() });
        } catch (error) {
          console.error('[DocumentStore] Update error:', error);
          set({ syncError: (error as Error).message });
        }
      },
      
      deleteDocumentAsync: async (id) => {
        // Optimistic update
        get().deleteDocument(id);
        
        try {
          const response = await fetch(`/api/documents/${id}`, {
            method: 'DELETE',
          });
          
          if (!response.ok) throw new Error('Failed to delete document');
          set({ lastSynced: new Date().toISOString() });
        } catch (error) {
          console.error('[DocumentStore] Delete error:', error);
          set({ syncError: (error as Error).message });
        }
      },

      // =========================================================================
      // LOCAL ACTIONS (for optimistic updates)
      // =========================================================================

      addDocument: (docData) => {
        const id = generateId('doc');
        const now = timestamp();
        set((s) => ({ documents: [...s.documents, { ...docData, id, createdAt: now, updatedAt: now }] }));
        return id;
      },

      updateDocument: (id, updates) => {
        set((s) => ({ documents: s.documents.map((d) => d.id === id ? { ...d, ...updates, updatedAt: timestamp() } : d) }));
      },

      deleteDocument: (id) => {
        set((s) => ({
          documents: s.documents.filter((d) => d.id !== id),
          versions: s.versions.filter((v) => v.documentId !== id),
          qcRuns: s.qcRuns.filter((q) => q.documentId !== id),
          selectedDocumentId: s.selectedDocumentId === id ? null : s.selectedDocumentId,
        }));
      },

      getDocument: (id) => get().documents.find((d) => d.id === id),
      getDocumentsForApplication: (applicationId) => get().documents.filter((d) => d.applicationId === applicationId),
      getDocumentsForSequence: (sequenceId) => get().documents.filter((d) => d.sequenceId === sequenceId),
      getDocumentsByModule: (applicationId, module) => get().documents.filter((d) => d.applicationId === applicationId && d.module === module),
      getDocumentsBySection: (applicationId, section) => get().documents.filter((d) => d.applicationId === applicationId && d.section.startsWith(section)),

      createVersion: (documentId, changeDescription) => {
        const doc = get().getDocument(documentId);
        if (!doc) throw new Error(`Document ${documentId} not found`);
        const versionId = generateId('ver');
        const now = timestamp();
        const [major, minor] = doc.version.split('.').map(Number);
        const newVersion = `${major}.${minor + 1}`;
        set((s) => ({
          versions: [...s.versions, { id: versionId, documentId, version: doc.version, changeDescription, createdAt: now }],
          documents: s.documents.map((d) => d.id === documentId ? { ...d, version: newVersion, updatedAt: now } : d),
        }));
        return versionId;
      },

      getVersionHistory: (documentId) => get().versions.filter((v) => v.documentId === documentId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

      recordQCRun: (documentId, results, runBy) => {
        const runId = generateId('qc');
        const now = timestamp();
        const overall = computeOverallQCResult(results);
        set((s) => ({
          qcRuns: [...s.qcRuns, { id: runId, documentId, runAt: now, runBy, results, overallResult: overall }],
          documents: s.documents.map((d) => d.id === documentId ? { ...d, qcResults: results.map((r) => r.result), qcCompletedAt: now, status: overall === 'pass' ? 'qc-passed' : overall === 'fail' ? 'qc-failed' : d.status, updatedAt: now } : d),
        }));
        return runId;
      },

      getLatestQCRun: (documentId) => get().qcRuns.filter((q) => q.documentId === documentId).sort((a, b) => b.runAt.localeCompare(a.runAt))[0],
      getQCHistory: (documentId) => get().qcRuns.filter((q) => q.documentId === documentId).sort((a, b) => b.runAt.localeCompare(a.runAt)),

      submitForReview: (id) => get().updateDocument(id, { status: 'in-review' }),
      approveDocument: (id, approver) => get().updateDocument(id, { status: 'approved', approver }),
      rejectDocument: (id, reason) => get().updateDocument(id, { status: 'draft' }),
      finalizeDocument: (id) => get().updateDocument(id, { status: 'final' }),
      assignToSequence: (documentId, sequenceId) => get().updateDocument(documentId, { sequenceId }),
      unassignFromSequence: (documentId) => get().updateDocument(documentId, { sequenceId: undefined }),
      selectDocument: (id) => set({ selectedDocumentId: id }),
      importDocuments: (docs) => set((s) => ({ documents: [...s.documents, ...docs] })),
      exportDocuments: (applicationId) => applicationId ? get().documents.filter((d) => d.applicationId === applicationId) : get().documents,
      clearAll: () => set({ documents: [], versions: [], qcRuns: [], selectedDocumentId: null }),
    }),
    { name: 'ligature-documents', storage: createJSONStorage(() => localStorage), version: 1 }
  )
);

export const useDocuments = () => useDocumentStore((s) => s.documents);
export const useSelectedDocument = () => {
  const documents = useDocumentStore((s) => s.documents);
  const selectedId = useDocumentStore((s) => s.selectedDocumentId);
  return documents.find((d) => d.id === selectedId) ?? null;
};
export const useDocumentsByModule = (applicationId: string) => {
  const documents = useDocumentStore((s) => s.documents);
  const appDocs = documents.filter((d) => d.applicationId === applicationId);
  return { m1: appDocs.filter((d) => d.module === 'm1'), m2: appDocs.filter((d) => d.module === 'm2'), m3: appDocs.filter((d) => d.module === 'm3'), m4: appDocs.filter((d) => d.module === 'm4'), m5: appDocs.filter((d) => d.module === 'm5') };
};
export const useDocumentStats = (applicationId: string) => {
  const documents = useDocumentStore((s) => s.documents);
  const appDocs = documents.filter((d) => d.applicationId === applicationId);
  return { total: appDocs.length, draft: appDocs.filter((d) => d.status === 'draft').length, inReview: appDocs.filter((d) => d.status === 'in-review').length, final: appDocs.filter((d) => d.status === 'final').length, qcPassed: appDocs.filter((d) => d.status === 'qc-passed').length, qcFailed: appDocs.filter((d) => d.status === 'qc-failed').length, totalPages: appDocs.reduce((sum, d) => sum + (d.pageCount || 0), 0), totalSize: appDocs.reduce((sum, d) => sum + (d.fileSize || 0), 0) };
};

// Sync state hooks
export const useDocumentSyncState = () => useDocumentStore((s) => ({
  isLoading: s.isLoading,
  lastSynced: s.lastSynced,
  syncError: s.syncError,
}));

// Async action hooks
export const useDocumentActions = () => useDocumentStore((s) => ({
  fetchDocuments: s.fetchDocuments,
  createDocumentAsync: s.createDocumentAsync,
  updateDocumentAsync: s.updateDocumentAsync,
  deleteDocumentAsync: s.deleteDocumentAsync,
  syncDocument: s.syncDocument,
}));
