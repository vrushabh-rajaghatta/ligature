

// =============================================================================
// eCTD PUBLISHING STORE - v0.9.12
// =============================================================================
// Zustand store for eCTD publishing operations including application/sequence
// CRUD, document management, validation execution, and publishing jobs.
// =============================================================================

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { useMemo } from 'react';
import {
  ECTDApplication,
  ECTDSequence,
  ECTDModuleContent,
  ECTDSection,
  ECTDLeafDocument,
  ECTDPublishingState,
  ECTDPublishingView,
  ECTDPublishingFilters,
  ValidationStatus,
  ValidationIssue,
  ValidationRule,
  PublishingJob,
  PublishingJobStatus,
  GatewayResponse,
  SequenceStatus,
  SequenceType,
  LifecycleOperation,
  CTDModule,
  RegionalSubmissionType,
  ECTDSpecVersion,
  ValidationCategory,
  ValidationSeverity,
  generateECTDId,
  formatSequenceNumber,
  CTD_MODULE_CONFIG,
} from './ectd-publishing-types';
import {
  RegulatoryRegion,
  getRegionalConfiguration,
  getSubmissionTypes,
} from './ectd-regional-types';

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: ECTDPublishingState = {
  // Applications
  applications: {},
  applicationIndex: [],
  selectedApplicationId: null,
  
  // Sequences
  sequences: {},
  sequencesByApplication: {},
  selectedSequenceId: null,
  
  // Documents
  documents: {},
  documentsBySequence: {},
  selectedDocumentId: null,
  
  // Validation
  validationRules: {},
  validationResults: {},
  
  // Publishing
  publishingJobs: {},
  activeJobId: null,
  
  // UI State
  activeView: 'applications',
  filters: {},
  isLoading: false,
  error: null,
};

// =============================================================================
// STORE ACTIONS INTERFACE
// =============================================================================

interface ECTDPublishingActions {
  // Application CRUD
  createApplication: (data: Partial<ECTDApplication>) => ECTDApplication;
  updateApplication: (id: string, updates: Partial<ECTDApplication>) => void;
  deleteApplication: (id: string) => void;
  selectApplication: (id: string | null) => void;
  getApplication: (id: string) => ECTDApplication | null;
  
  // Sequence CRUD
  createSequence: (applicationId: string, data: Partial<ECTDSequence>) => ECTDSequence;
  updateSequence: (id: string, updates: Partial<ECTDSequence>) => void;
  deleteSequence: (id: string) => void;
  selectSequence: (id: string | null) => void;
  updateSequenceStatus: (id: string, status: SequenceStatus) => void;
  getSequence: (id: string) => ECTDSequence | null;
  getSequencesForApplication: (applicationId: string) => ECTDSequence[];
  
  // Document Management
  addDocument: (sequenceId: string, sectionId: string, document: Partial<ECTDLeafDocument>) => ECTDLeafDocument;
  updateDocument: (id: string, updates: Partial<ECTDLeafDocument>) => void;
  removeDocument: (id: string) => void;
  selectDocument: (id: string | null) => void;
  setDocumentOperation: (id: string, operation: LifecycleOperation) => void;
  getDocument: (id: string) => ECTDLeafDocument | null;
  getDocumentsForSequence: (sequenceId: string) => ECTDLeafDocument[];
  
  // Validation
  runValidation: (sequenceId: string) => Promise<ValidationStatus>;
  addValidationRule: (rule: ValidationRule) => void;
  resolveIssue: (issueId: string, resolution: string) => void;
  waiveIssue: (issueId: string, justification: string) => void;
  getValidationStatus: (sequenceId: string) => ValidationStatus | null;
  
  // Publishing Jobs
  createPublishingJob: (sequenceId: string, options: Partial<PublishingJob>) => PublishingJob;
  startPublishingJob: (jobId: string) => Promise<void>;
  cancelPublishingJob: (jobId: string) => void;
  getPublishingJob: (jobId: string) => PublishingJob | null;
  updateJobStatus: (jobId: string, status: PublishingJobStatus, progress?: number) => void;
  
  // UI State
  setActiveView: (view: ECTDPublishingView) => void;
  setFilters: (filters: Partial<ECTDPublishingFilters>) => void;
  clearFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Bulk Operations
  loadMockData: () => void;
  reset: () => void;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateChecksum(algorithm: 'md5' | 'sha256' = 'sha256'): string {
  const length = algorithm === 'md5' ? 32 : 64;
  return Array.from({ length }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

function createEmptyValidationStatus(): ValidationStatus {
  return {
    isValid: true,
    lastRun: new Date().toISOString(),
    totalErrors: 0,
    totalWarnings: 0,
    totalInfo: 0,
    completeness: 0,
    issues: [],
    rulesPassed: 0,
    rulesFailed: 0,
    rulesSkipped: 0,
  };
}

function createDefaultModules(sequenceId: string): ECTDModuleContent[] {
  const modules: CTDModule[] = ['m1', 'm2', 'm3', 'm4', 'm5'];
  return modules.map(moduleId => ({
    id: generateECTDId.module(),
    sequenceId,
    moduleId,
    title: CTD_MODULE_CONFIG[moduleId].title,
    sections: [],
    documentCount: 0,
    totalSizeBytes: 0,
    lastModified: new Date().toISOString(),
  }));
}

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useECTDPublishingStore = create<ECTDPublishingState & ECTDPublishingActions>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,
      
      // =========================================================================
      // APPLICATION CRUD
      // =========================================================================
      
      createApplication: (data) => {
        const id = generateECTDId.application();
        const now = new Date().toISOString();
        
        const application: ECTDApplication = {
          id,
          applicationNumber: data.applicationNumber || `APP-${Date.now()}`,
          submissionType: data.submissionType || 'nda',
          region: data.region || 'US',
          ectdVersion: data.ectdVersion || '4.0',
          productId: data.productId || '',
          productName: data.productName || 'New Product',
          substanceNames: data.substanceNames || [],
          dosageForms: data.dosageForms || [],
          sponsorName: data.sponsorName || 'Ligature Therapeutics',
          receivingAgency: data.receivingAgency || 'FDA',
          status: 'planning',
          createdAt: now,
          updatedAt: now,
          sequences: [],
          archivePath: `/archive/${id}`,
          ...data,
        };
        
        set(state => ({
          applications: { ...state.applications, [id]: application },
          applicationIndex: [...state.applicationIndex, id],
        }));
        
        return application;
      },
      
      updateApplication: (id, updates) => {
        set(state => {
          const existing = state.applications[id];
          if (!existing) return state;
          
          return {
            applications: {
              ...state.applications,
              [id]: {
                ...existing,
                ...updates,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },
      
      deleteApplication: (id) => {
        set(state => {
          const { [id]: removed, ...remaining } = state.applications;
          return {
            applications: remaining,
            applicationIndex: state.applicationIndex.filter(appId => appId !== id),
            selectedApplicationId: state.selectedApplicationId === id ? null : state.selectedApplicationId,
          };
        });
      },
      
      selectApplication: (id) => {
        set({ selectedApplicationId: id });
      },
      
      getApplication: (id) => {
        return get().applications[id] || null;
      },
      
      // =========================================================================
      // SEQUENCE CRUD
      // =========================================================================
      
      createSequence: (applicationId, data) => {
        const id = generateECTDId.sequence();
        const now = new Date().toISOString();
        const app = get().applications[applicationId];
        
        // Calculate next sequence number
        const existingSequences = get().sequencesByApplication[applicationId] || [];
        const nextNum = existingSequences.length;
        const ectdVersion = app?.ectdVersion || '4.0';
        
        const sequence: ECTDSequence = {
          id,
          applicationId,
          sequenceNumber: formatSequenceNumber(nextNum, ectdVersion),
          sequenceType: data.sequenceType || 'original',
          sequenceDescription: data.sequenceDescription || 'New Sequence',
          submissionType: data.submissionType || 'original',
          status: 'planning',
          createdAt: now,
          updatedAt: now,
          modules: createDefaultModules(id),
          validationStatus: createEmptyValidationStatus(),
          ...data,
        };
        
        set(state => ({
          sequences: { ...state.sequences, [id]: sequence },
          sequencesByApplication: {
            ...state.sequencesByApplication,
            [applicationId]: [...(state.sequencesByApplication[applicationId] || []), id],
          },
        }));
        
        return sequence;
      },
      
      updateSequence: (id, updates) => {
        set(state => {
          const existing = state.sequences[id];
          if (!existing) return state;
          
          return {
            sequences: {
              ...state.sequences,
              [id]: {
                ...existing,
                ...updates,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },
      
      deleteSequence: (id) => {
        const sequence = get().sequences[id];
        if (!sequence) return;
        
        set(state => {
          const { [id]: removed, ...remainingSequences } = state.sequences;
          const appSequences = state.sequencesByApplication[sequence.applicationId] || [];
          
          return {
            sequences: remainingSequences,
            sequencesByApplication: {
              ...state.sequencesByApplication,
              [sequence.applicationId]: appSequences.filter(seqId => seqId !== id),
            },
            selectedSequenceId: state.selectedSequenceId === id ? null : state.selectedSequenceId,
          };
        });
      },
      
      selectSequence: (id) => {
        set({ selectedSequenceId: id });
      },
      
      updateSequenceStatus: (id, status) => {
        set(state => {
          const existing = state.sequences[id];
          if (!existing) return state;
          
          return {
            sequences: {
              ...state.sequences,
              [id]: {
                ...existing,
                status,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },
      
      getSequence: (id) => {
        return get().sequences[id] || null;
      },
      
      getSequencesForApplication: (applicationId) => {
        const sequenceIds = get().sequencesByApplication[applicationId] || [];
        const sequences = get().sequences;
        return sequenceIds.map(id => sequences[id]).filter(Boolean);
      },
      
      // =========================================================================
      // DOCUMENT MANAGEMENT
      // =========================================================================
      
      addDocument: (sequenceId: string, sectionId: string, data: Partial<ECTDLeafDocument>) => {
        const id = generateECTDId.document();
        const now = new Date().toISOString();
        
        const document: ECTDLeafDocument = {
          id,
          sectionId,
          title: data.title || 'Untitled Document',
          fileName: data.fileName || 'document.pdf',
          filePath: data.filePath || `documents/${id}.pdf`,
          fileType: data.fileType || 'pdf',
          fileSizeBytes: data.fileSizeBytes || 0,
          checksum: data.checksum || generateChecksum(),
          checksumAlgorithm: data.checksumAlgorithm || 'sha256',
          checksumVerified: false,
          operation: data.operation || 'new',
          languageCode: data.languageCode || 'en',
          createdAt: now,
          modifiedAt: now,
          validationStatus: {
            isValid: true,
            lastChecked: now,
            errors: 0,
            warnings: 0,
            issues: [],
          },
          ...data,
        };
        
        set(state => ({
          documents: { ...state.documents, [id]: document },
          documentsBySequence: {
            ...state.documentsBySequence,
            [sequenceId]: [...(state.documentsBySequence[sequenceId] || []), id],
          },
        }));
        
        return document;
      },
      
      updateDocument: (id: string, updates: Partial<ECTDLeafDocument>) => {
        set(state => {
          const existing = state.documents[id];
          if (!existing) return state;
          
          return {
            documents: {
              ...state.documents,
              [id]: {
                ...existing,
                ...updates,
                modifiedAt: new Date().toISOString(),
              },
            },
          };
        });
      },
      
      removeDocument: (id) => {
        set(state => {
          const { [id]: removed, ...remainingDocs } = state.documents;
          
          // Remove from all sequence document lists
          const updatedDocsBySeq: Record<string, string[]> = {};
          for (const [seqId, docIds] of Object.entries(state.documentsBySequence)) {
            updatedDocsBySeq[seqId] = docIds.filter(docId => docId !== id);
          }
          
          return {
            documents: remainingDocs,
            documentsBySequence: updatedDocsBySeq,
            selectedDocumentId: state.selectedDocumentId === id ? null : state.selectedDocumentId,
          };
        });
      },
      
      selectDocument: (id) => {
        set({ selectedDocumentId: id });
      },
      
      setDocumentOperation: (id, operation) => {
        set(state => {
          const existing = state.documents[id];
          if (!existing) return state;
          
          return {
            documents: {
              ...state.documents,
              [id]: {
                ...existing,
                operation,
                modifiedAt: new Date().toISOString(),
              },
            },
          };
        });
      },
      
      getDocument: (id: string) => {
        return get().documents[id] || null;
      },
      
      getDocumentsForSequence: (sequenceId: string) => {
        const docIds = get().documentsBySequence[sequenceId] || [];
        const documents = get().documents;
        return docIds.map(id => documents[id]).filter(Boolean);
      },
      
      // =========================================================================
      // VALIDATION
      // =========================================================================
      
      runValidation: async (sequenceId: string) => {
        set({ isLoading: true });
        
        // Simulate validation process
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const sequence = get().sequences[sequenceId];
        const documents = get().getDocumentsForSequence(sequenceId);
        
        // Generate mock validation issues
        const issues: ValidationIssue[] = [];
        let errorCount = 0;
        let warningCount = 0;
        let infoCount = 0;
        
        // Check for missing required documents
        if (documents.length === 0) {
          issues.push({
            id: generateECTDId.validation(),
            ruleId: 'REQ-001',
            ruleName: 'Required Documents',
            category: 'structure',
            severity: 'error',
            message: 'No documents found in sequence',
            details: 'At least one document is required for submission',
            isResolved: false,
            isWaived: false,
          });
          errorCount++;
        }
        
        // Check each document
        for (const doc of documents) {
          // PDF version check
          if (doc.fileType === 'pdf' && doc.pdfAttributes) {
            const version = parseFloat(doc.pdfAttributes.version);
            if (version < 1.4 || version > 1.7) {
              issues.push({
                id: generateECTDId.validation(),
                ruleId: 'PDF-001',
                ruleName: 'PDF Version',
                category: 'pdf',
                severity: 'error',
                message: `PDF version ${doc.pdfAttributes.version} not compliant`,
                details: 'PDF version must be between 1.4 and 1.7',
                documentId: doc.id,
                documentPath: doc.filePath,
                isResolved: false,
                isWaived: false,
              });
              errorCount++;
            }
            
            // Bookmark check
            if (!doc.pdfAttributes.hasBookmarks) {
              issues.push({
                id: generateECTDId.validation(),
                ruleId: 'PDF-002',
                ruleName: 'PDF Bookmarks',
                category: 'pdf',
                severity: 'warning',
                message: 'PDF missing bookmarks',
                details: 'Bookmarks are recommended for documents over 5 pages',
                documentId: doc.id,
                documentPath: doc.filePath,
                isResolved: false,
                isWaived: false,
              });
              warningCount++;
            }
          }
          
          // Checksum verification
          if (!doc.checksumVerified) {
            issues.push({
              id: generateECTDId.validation(),
              ruleId: 'CHK-001',
              ruleName: 'Checksum Verification',
              category: 'checksum',
              severity: 'info',
              message: 'Checksum not yet verified',
              documentId: doc.id,
              documentPath: doc.filePath,
              isResolved: false,
              isWaived: false,
            });
            infoCount++;
          }
        }
        
        const validationStatus: ValidationStatus = {
          isValid: errorCount === 0,
          lastRun: new Date().toISOString(),
          totalErrors: errorCount,
          totalWarnings: warningCount,
          totalInfo: infoCount,
          completeness: documents.length > 0 ? Math.min(100, documents.length * 20) : 0,
          issues,
          rulesPassed: Math.max(0, 10 - errorCount - warningCount),
          rulesFailed: errorCount + warningCount,
          rulesSkipped: 0,
        };
        
        // Update sequence validation status
        set(state => ({
          isLoading: false,
          sequences: {
            ...state.sequences,
            [sequenceId]: {
              ...state.sequences[sequenceId],
              validationStatus,
              lastValidatedAt: new Date().toISOString(),
            },
          },
          validationResults: {
            ...state.validationResults,
            [sequenceId]: validationStatus,
          },
        }));
        
        return validationStatus;
      },
      
      addValidationRule: (rule) => {
        set(state => ({
          validationRules: {
            ...state.validationRules,
            [rule.id]: rule,
          },
        }));
      },
      
      resolveIssue: (issueId, resolution) => {
        set(state => {
          // Find and update the issue in validation results
          const updatedResults: Record<string, ValidationStatus> = {};
          
          for (const [seqId, status] of Object.entries(state.validationResults)) {
            const updatedIssues = status.issues.map(issue =>
              issue.id === issueId
                ? {
                    ...issue,
                    isResolved: true,
                    resolvedAt: new Date().toISOString(),
                    resolution,
                  }
                : issue
            );
            
            updatedResults[seqId] = {
              ...status,
              issues: updatedIssues,
            };
          }
          
          return { validationResults: updatedResults };
        });
      },
      
      waiveIssue: (issueId, justification) => {
        set(state => {
          const updatedResults: Record<string, ValidationStatus> = {};
          
          for (const [seqId, status] of Object.entries(state.validationResults)) {
            const updatedIssues = status.issues.map(issue =>
              issue.id === issueId
                ? {
                    ...issue,
                    isWaived: true,
                    waivedAt: new Date().toISOString(),
                    waiverJustification: justification,
                  }
                : issue
            );
            
            updatedResults[seqId] = {
              ...status,
              issues: updatedIssues,
            };
          }
          
          return { validationResults: updatedResults };
        });
      },
      
      getValidationStatus: (sequenceId: string) => {
        return get().validationResults[sequenceId] || null;
      },
      
      // =========================================================================
      // PUBLISHING JOBS
      // =========================================================================
      
      createPublishingJob: (sequenceId: string, options: Partial<PublishingJob>) => {
        const id = generateECTDId.job();
        const now = new Date().toISOString();
        
        const job: PublishingJob = {
          id,
          sequenceId,
          outputFormat: options.outputFormat || 'ectd',
          targetGateway: options.targetGateway,
          validationLevel: options.validationLevel || 'full',
          includeViewerFiles: options.includeViewerFiles ?? true,
          status: 'queued',
          progress: 0,
          currentStep: 'Queued',
          createdAt: now,
          ...options,
        };
        
        set(state => ({
          publishingJobs: { ...state.publishingJobs, [id]: job },
        }));
        
        return job;
      },
      
      startPublishingJob: async (jobId: string) => {
        const job = get().publishingJobs[jobId];
        if (!job) throw new Error('Job not found');
        
        const updateJob = (updates: Partial<PublishingJob>) => {
          set(state => ({
            publishingJobs: {
              ...state.publishingJobs,
              [jobId]: { ...state.publishingJobs[jobId], ...updates },
            },
          }));
        };
        
        // Start job
        updateJob({ status: 'validating', progress: 10, currentStep: 'Validating submission...', startedAt: new Date().toISOString() });
        set({ activeJobId: jobId });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Generate backbone
        updateJob({ status: 'generating', progress: 30, currentStep: 'Generating eCTD backbone...' });
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Package files
        updateJob({ status: 'packaging', progress: 60, currentStep: 'Packaging submission files...' });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Transmit
        updateJob({ status: 'transmitting', progress: 85, currentStep: 'Transmitting to gateway...' });
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Complete
        const gatewayResponse: GatewayResponse = {
          gateway: job.targetGateway || 'FDA-ESG',
          transactionId: `TXN-${Date.now()}`,
          status: 'accepted',
          receivedAt: new Date().toISOString(),
          acknowledgementNumber: `ACK-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          messages: [
            { type: 'info', code: 'SUB-001', message: 'Submission received successfully' },
          ],
        };
        
        updateJob({
          status: 'completed',
          progress: 100,
          currentStep: 'Complete',
          completedAt: new Date().toISOString(),
          gatewayResponse,
        });
        
        set({ activeJobId: null });
      },
      
      cancelPublishingJob: (jobId) => {
        set(state => ({
          publishingJobs: {
            ...state.publishingJobs,
            [jobId]: {
              ...state.publishingJobs[jobId],
              status: 'cancelled',
              completedAt: new Date().toISOString(),
            },
          },
          activeJobId: state.activeJobId === jobId ? null : state.activeJobId,
        }));
      },
      
      getPublishingJob: (jobId) => {
        return get().publishingJobs[jobId] || null;
      },
      
      updateJobStatus: (jobId, status, progress) => {
        set(state => ({
          publishingJobs: {
            ...state.publishingJobs,
            [jobId]: {
              ...state.publishingJobs[jobId],
              status,
              progress: progress ?? state.publishingJobs[jobId]?.progress ?? 0,
            },
          },
        }));
      },
      
      // =========================================================================
      // UI STATE
      // =========================================================================
      
      setActiveView: (view) => set({ activeView: view }),
      
      setFilters: (filters) => set(state => ({ filters: { ...state.filters, ...filters } })),
      
      clearFilters: () => set({ filters: {} }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (error) => set({ error }),
      
      // =========================================================================
      // BULK OPERATIONS
      // =========================================================================
      
      loadMockData: () => {
        // Import mock data
        const { mockECTDPublishingData } = require('../data/ectd-publishing-data');
        set(mockECTDPublishingData);
      },
      
      reset: () => set(initialState),
    })),
    { name: 'ectd-publishing-store' }
  )
);

// =============================================================================
// SELECTORS
// =============================================================================

export const useSelectedApplication = () => {
  const selectedId = useECTDPublishingStore(s => s.selectedApplicationId);
  const applications = useECTDPublishingStore(s => s.applications);
  return selectedId ? applications[selectedId] : null;
};

export const useSelectedSequence = () => {
  const selectedId = useECTDPublishingStore(s => s.selectedSequenceId);
  const sequences = useECTDPublishingStore(s => s.sequences);
  return selectedId ? sequences[selectedId] : null;
};

export const useSelectedDocument = () => {
  const selectedId = useECTDPublishingStore(s => s.selectedDocumentId);
  const documents = useECTDPublishingStore(s => s.documents);
  return selectedId ? documents[selectedId] : null;
};

export const useApplicationList = () => {
  const applications = useECTDPublishingStore(s => s.applications);
  const index = useECTDPublishingStore(s => s.applicationIndex);
  return useMemo(() => index.map(id => applications[id]).filter(Boolean), [applications, index]);
};

export const useSequenceList = (applicationId: string | null) => {
  const sequences = useECTDPublishingStore(s => s.sequences);
  const sequencesByApp = useECTDPublishingStore(s => s.sequencesByApplication);
  
  return useMemo(() => {
    if (!applicationId) return [];
    const seqIds = sequencesByApp[applicationId] || [];
    return seqIds.map(id => sequences[id]).filter(Boolean);
  }, [applicationId, sequences, sequencesByApp]);
};

export const useDocumentList = (sequenceId: string | null) => {
  const documents = useECTDPublishingStore(s => s.documents);
  const docsBySeq = useECTDPublishingStore(s => s.documentsBySequence);
  
  return useMemo(() => {
    if (!sequenceId) return [];
    const docIds = docsBySeq[sequenceId] || [];
    return docIds.map(id => documents[id]).filter(Boolean);
  }, [sequenceId, documents, docsBySeq]);
};

export const useActivePublishingJob = () => {
  const activeId = useECTDPublishingStore(s => s.activeJobId);
  const jobs = useECTDPublishingStore(s => s.publishingJobs);
  return activeId ? jobs[activeId] : null;
};

export const usePublishingJobList = () => {
  const jobs = useECTDPublishingStore(s => s.publishingJobs);
  return useMemo(() => Object.values(jobs), [jobs]);
};

export const usePublishingFilters = () => useECTDPublishingStore(s => s.filters);
export const usePublishingView = () => useECTDPublishingStore(s => s.activeView);
export const usePublishingLoading = () => useECTDPublishingStore(s => s.isLoading);
export const usePublishingError = () => useECTDPublishingStore(s => s.error);

// Filtered application list selector
export const useFilteredApplications = () => {
  const applications = useECTDPublishingStore(s => s.applications);
  const index = useECTDPublishingStore(s => s.applicationIndex);
  const filters = useECTDPublishingStore(s => s.filters);
  
  return useMemo(() => {
    let apps = index.map(id => applications[id]).filter(Boolean);
    
    if (filters.region) {
      apps = apps.filter(app => app.region === filters.region);
    }
    
    if (filters.submissionType) {
      apps = apps.filter(app => app.submissionType === filters.submissionType);
    }
    
    if (filters.status) {
      apps = apps.filter(app => app.status === filters.status);
    }
    
    if (filters.search) {
      const search = filters.search.toLowerCase();
      apps = apps.filter(app => 
        app.applicationNumber.toLowerCase().includes(search) ||
        app.productName.toLowerCase().includes(search) ||
        app.sponsorName.toLowerCase().includes(search)
      );
    }
    
    return apps;
  }, [applications, index, filters]);
};
