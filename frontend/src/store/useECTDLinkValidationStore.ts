

// =============================================================================
// eCTD LINK VALIDATION STORE - v0.9.17d
// =============================================================================
// Zustand store for validating hyperlinks and cross-references within eCTD
// Provides broken link detection, auto-fix suggestions, and compliance checking
// =============================================================================

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  CrossReference,
  CrossReferenceStatus,
  DocumentCrossRefValidation,
  SequenceCrossRefValidation,
  OrphanedReference,
  CircularChain,
  CrossRefValidationOptions,
  DEFAULT_CROSS_REF_OPTIONS,
  ValidationProgress,
  SuggestedFix,
  CrossRefReport,
  CROSS_REF_VALIDATION_RULES,
  LinkType,
} from './cross-reference-types';

// =============================================================================
// Store State Interface
// =============================================================================

interface ECTDLinkValidationState {
  // Current validation results
  currentValidation: SequenceCrossRefValidation | null;
  documentValidations: Map<string, DocumentCrossRefValidation>;
  
  // Validation in progress
  isValidating: boolean;
  validationProgress: ValidationProgress | null;
  validationError: string | null;
  
  // Configuration
  validationOptions: CrossRefValidationOptions;
  enabledRules: string[];
  
  // Selection state
  selectedDocumentId: string | null;
  selectedReferenceId: string | null;
  
  // Filters
  statusFilter: CrossReferenceStatus | 'all';
  moduleFilter: string | null;
  typeFilter: LinkType | 'all';
  
  // Fix tracking
  pendingFixes: Map<string, SuggestedFix>;
  appliedFixes: string[];
  
  // Actions
  startValidation: (sequenceId: string, applicationId: string, options?: Partial<CrossRefValidationOptions>) => Promise<void>;
  cancelValidation: () => void;
  revalidateDocument: (documentId: string) => Promise<DocumentCrossRefValidation>;
  
  // Selection
  selectDocument: (documentId: string | null) => void;
  selectReference: (referenceId: string | null) => void;
  
  // Filtering
  setStatusFilter: (status: CrossReferenceStatus | 'all') => void;
  setModuleFilter: (module: string | null) => void;
  setTypeFilter: (type: LinkType | 'all') => void;
  
  // Configuration
  setValidationOptions: (options: Partial<CrossRefValidationOptions>) => void;
  toggleRule: (ruleId: string) => void;
  
  // Fixes
  applyFix: (referenceId: string) => Promise<boolean>;
  applyAllAutoFixes: () => Promise<number>;
  dismissFix: (referenceId: string) => void;
  
  // Export
  generateReport: () => CrossRefReport | null;
  exportToCsv: () => string;
  
  // Computed
  getFilteredReferences: () => CrossReference[];
  getIssuesByModule: () => Map<string, CrossReference[]>;
  getAutoFixableCount: () => number;
  
  reset: () => void;
}

// =============================================================================
// Mock Data Generators
// =============================================================================

const MOCK_DOCUMENTS = [
  { module: 'm1', section: 'us', title: 'Cover Letter', path: 'm1/us/cover-letter.pdf' },
  { module: 'm1', section: 'us', title: 'Form FDA 356h', path: 'm1/us/form-fda-356h.pdf' },
  { module: 'm2', section: '2.2', title: 'Introduction', path: 'm2/22-intro.pdf' },
  { module: 'm2', section: '2.3', title: 'Quality Overall Summary', path: 'm2/23-qos.pdf' },
  { module: 'm2', section: '2.4', title: 'Nonclinical Overview', path: 'm2/24-nonclinical-overview.pdf' },
  { module: 'm2', section: '2.5', title: 'Clinical Overview', path: 'm2/25-clinical-overview.pdf' },
  { module: 'm2', section: '2.6', title: 'Nonclinical Written Summaries', path: 'm2/26-nonclinical-summaries.pdf' },
  { module: 'm2', section: '2.7', title: 'Clinical Summary', path: 'm2/27-clinical-summary.pdf' },
  { module: 'm3', section: '3.2.S', title: 'Drug Substance', path: 'm3/32s-drug-substance.pdf' },
  { module: 'm3', section: '3.2.P', title: 'Drug Product', path: 'm3/32p-drug-product.pdf' },
  { module: 'm4', section: '4.2.1', title: 'Pharmacology Studies', path: 'm4/421-pharmacology.pdf' },
  { module: 'm4', section: '4.2.3', title: 'Toxicology Studies', path: 'm4/423-toxicology.pdf' },
  { module: 'm5', section: '5.3.1', title: 'BA/BE Study Report', path: 'm5/531-babe-report.pdf' },
  { module: 'm5', section: '5.3.5', title: 'Clinical Efficacy Report', path: 'm5/535-efficacy-report.pdf' },
  { module: 'm5', section: '5.3.5', title: 'Clinical Study Report LIG-301', path: 'm5/535-csr-lig301.pdf' },
];

function generateMockReferences(doc: typeof MOCK_DOCUMENTS[0], docIndex: number): CrossReference[] {
  const references: CrossReference[] = [];
  const numRefs = Math.floor(Math.random() * 6) + 2;
  
  for (let i = 0; i < numRefs; i++) {
    // Pick a random target document
    const targetIdx = Math.floor(Math.random() * MOCK_DOCUMENTS.length);
    const target = MOCK_DOCUMENTS[targetIdx];
    
    // Determine status - most should be valid
    const rand = Math.random();
    let status: CrossReferenceStatus = 'valid';
    let error: string | undefined;
    let fix: SuggestedFix | undefined;
    
    if (rand < 0.08) {
      status = 'broken';
      error = 'Target document not found in sequence';
      fix = {
        type: 'update-path',
        description: `Update path to "${target.path.replace('.pdf', '-v2.pdf')}"`,
        confidence: 85,
        suggestedPath: target.path.replace('.pdf', '-v2.pdf'),
        autoFixable: true,
      };
    } else if (rand < 0.15) {
      status = 'warning';
      error = 'Target section anchor may have moved';
      fix = {
        type: 'update-anchor',
        description: 'Verify anchor location in target document',
        confidence: 60,
        autoFixable: false,
      };
    }
    
    const ref: CrossReference = {
      id: `${doc.path}-ref-${i}`,
      sourceDocumentId: `doc-${docIndex}`,
      sourceDocumentTitle: doc.title,
      sourceFilePath: doc.path,
      sourceModule: doc.module,
      sourceSection: doc.section,
      targetType: targetIdx === docIndex ? 'internal-section' : 'internal-document',
      targetPath: `../${target.path}`,
      targetDocumentId: `doc-${targetIdx}`,
      targetDocumentTitle: target.title,
      targetModule: target.module,
      targetSection: target.section,
      linkText: `See ${target.title}`,
      linkLocation: {
        pageNumber: Math.floor(Math.random() * 30) + 1,
        section: doc.section,
      },
      linkType: i === 0 ? 'table-of-contents' : 'pdf-hyperlink',
      status,
      validatedAt: new Date().toISOString(),
      validationError: error,
      suggestedFix: fix,
    };
    
    references.push(ref);
  }
  
  return references;
}

function generateMockDocumentValidation(doc: typeof MOCK_DOCUMENTS[0], index: number): DocumentCrossRefValidation {
  const references = generateMockReferences(doc, index);
  
  return {
    documentId: `doc-${index}`,
    documentTitle: doc.title,
    filePath: doc.path,
    module: doc.module,
    section: doc.section,
    totalReferences: references.length,
    validCount: references.filter(r => r.status === 'valid').length,
    brokenCount: references.filter(r => r.status === 'broken').length,
    warningCount: references.filter(r => r.status === 'warning').length,
    pendingCount: 0,
    references,
    validatedAt: new Date().toISOString(),
    validationDuration: Math.floor(Math.random() * 300) + 100,
  };
}

function generateMockSequenceValidation(sequenceId: string, applicationId: string): SequenceCrossRefValidation {
  const documentResults = MOCK_DOCUMENTS.map((doc, idx) => 
    generateMockDocumentValidation(doc, idx)
  );
  
  const totalReferences = documentResults.reduce((sum, d) => sum + d.totalReferences, 0);
  const validCount = documentResults.reduce((sum, d) => sum + d.validCount, 0);
  const brokenCount = documentResults.reduce((sum, d) => sum + d.brokenCount, 0);
  const warningCount = documentResults.reduce((sum, d) => sum + d.warningCount, 0);
  
  // Create orphaned references if there are broken links
  const orphanedReferences: OrphanedReference[] = brokenCount > 0 ? [{
    referencedPath: '../m5/missing-appendix.pdf',
    referencedFrom: [
      {
        documentId: documentResults[0].documentId,
        documentTitle: documentResults[0].documentTitle,
        filePath: documentResults[0].filePath,
      },
    ],
    suggestedMatches: ['../m5/535-appendix-a.pdf', '../m5/535-appendix-b.pdf'],
  }] : [];
  
  return {
    sequenceId,
    sequenceNumber: '0004',
    applicationId,
    applicationNumber: 'NDA-214356',
    totalDocuments: documentResults.length,
    documentsWithIssues: documentResults.filter(d => d.brokenCount > 0 || d.warningCount > 0).length,
    totalReferences,
    validCount,
    brokenCount,
    warningCount,
    orphanedCount: orphanedReferences.length,
    circularCount: 0,
    documentResults,
    orphanedReferences,
    circularChains: [],
    validatedAt: new Date().toISOString(),
    validationDuration: documentResults.reduce((sum, d) => sum + d.validationDuration, 0),
  };
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useECTDLinkValidationStore = create<ECTDLinkValidationState>()(
  immer((set, get) => ({
    // Initial state
    currentValidation: null,
    documentValidations: new Map(),
    isValidating: false,
    validationProgress: null,
    validationError: null,
    validationOptions: { ...DEFAULT_CROSS_REF_OPTIONS },
    enabledRules: CROSS_REF_VALIDATION_RULES.filter(r => r.enabled).map(r => r.id),
    selectedDocumentId: null,
    selectedReferenceId: null,
    statusFilter: 'all',
    moduleFilter: null,
    typeFilter: 'all',
    pendingFixes: new Map(),
    appliedFixes: [],
    
    // Start validation
    startValidation: async (sequenceId, applicationId, options) => {
      set(state => {
        state.isValidating = true;
        state.validationError = null;
        state.validationProgress = {
          phase: 'scanning',
          documentsScanned: 0,
          totalDocuments: MOCK_DOCUMENTS.length,
          referencesChecked: 0,
          totalReferences: 0,
          issuesFound: 0,
        };
        if (options) {
          state.validationOptions = { ...state.validationOptions, ...options };
        }
      });
      
      // Simulate scanning phase
      await new Promise(resolve => setTimeout(resolve, 400));
      
      set(state => {
        if (state.validationProgress) {
          state.validationProgress.phase = 'validating';
        }
      });
      
      // Simulate validation progress
      for (let i = 1; i <= MOCK_DOCUMENTS.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 80));
        set(state => {
          if (state.validationProgress) {
            state.validationProgress.documentsScanned = i;
            state.validationProgress.currentDocument = MOCK_DOCUMENTS[i - 1].title;
            state.validationProgress.referencesChecked = i * 4;
          }
        });
      }
      
      // Analyzing phase
      set(state => {
        if (state.validationProgress) {
          state.validationProgress.phase = 'analyzing';
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Generate results
      const validation = generateMockSequenceValidation(sequenceId, applicationId);
      
      set(state => {
        state.currentValidation = validation;
        state.documentValidations = new Map(
          validation.documentResults.map(d => [d.documentId, d])
        );
        state.isValidating = false;
        state.validationProgress = {
          phase: 'complete',
          documentsScanned: validation.totalDocuments,
          totalDocuments: validation.totalDocuments,
          referencesChecked: validation.totalReferences,
          totalReferences: validation.totalReferences,
          issuesFound: validation.brokenCount + validation.warningCount,
        };
        
        // Populate pending fixes
        state.pendingFixes = new Map();
        validation.documentResults.forEach(doc => {
          doc.references.forEach(ref => {
            if (ref.suggestedFix) {
              state.pendingFixes.set(ref.id, ref.suggestedFix);
            }
          });
        });
      });
    },
    
    cancelValidation: () => {
      set(state => {
        state.isValidating = false;
        state.validationProgress = null;
      });
    },
    
    revalidateDocument: async (documentId) => {
      const existing = get().documentValidations.get(documentId);
      if (!existing) throw new Error('Document not found');
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const docInfo = MOCK_DOCUMENTS.find((_, i) => `doc-${i}` === documentId);
      if (!docInfo) throw new Error('Document info not found');
      
      const idx = MOCK_DOCUMENTS.findIndex((_, i) => `doc-${i}` === documentId);
      const updated = generateMockDocumentValidation(docInfo, idx);
      
      set(state => {
        state.documentValidations.set(documentId, updated);
        
        // Update in current validation
        if (state.currentValidation) {
          const docIdx = state.currentValidation.documentResults.findIndex(d => d.documentId === documentId);
          if (docIdx >= 0) {
            state.currentValidation.documentResults[docIdx] = updated;
            // Recalculate totals
            state.currentValidation.brokenCount = state.currentValidation.documentResults
              .reduce((sum, d) => sum + d.brokenCount, 0);
            state.currentValidation.warningCount = state.currentValidation.documentResults
              .reduce((sum, d) => sum + d.warningCount, 0);
            state.currentValidation.validCount = state.currentValidation.documentResults
              .reduce((sum, d) => sum + d.validCount, 0);
          }
        }
      });
      
      return updated;
    },
    
    // Selection
    selectDocument: (documentId) => {
      set(state => {
        state.selectedDocumentId = documentId;
        state.selectedReferenceId = null;
      });
    },
    
    selectReference: (referenceId) => {
      set(state => {
        state.selectedReferenceId = referenceId;
      });
    },
    
    // Filtering
    setStatusFilter: (status) => set(state => { state.statusFilter = status; }),
    setModuleFilter: (module) => set(state => { state.moduleFilter = module; }),
    setTypeFilter: (type) => set(state => { state.typeFilter = type; }),
    
    // Configuration
    setValidationOptions: (options) => {
      set(state => {
        state.validationOptions = { ...state.validationOptions, ...options };
      });
    },
    
    toggleRule: (ruleId) => {
      set(state => {
        const idx = state.enabledRules.indexOf(ruleId);
        if (idx >= 0) {
          state.enabledRules.splice(idx, 1);
        } else {
          state.enabledRules.push(ruleId);
        }
      });
    },
    
    // Fixes
    applyFix: async (referenceId) => {
      const fix = get().pendingFixes.get(referenceId);
      if (!fix || !fix.autoFixable) return false;
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      set(state => {
        state.pendingFixes.delete(referenceId);
        state.appliedFixes.push(referenceId);
        
        // Update reference status in document validations
        state.documentValidations.forEach(doc => {
          const ref = doc.references.find(r => r.id === referenceId);
          if (ref) {
            ref.status = 'valid';
            ref.validationError = undefined;
            ref.suggestedFix = undefined;
            doc.brokenCount = doc.references.filter(r => r.status === 'broken').length;
            doc.warningCount = doc.references.filter(r => r.status === 'warning').length;
            doc.validCount = doc.references.filter(r => r.status === 'valid').length;
          }
        });
        
        // Update current validation totals
        if (state.currentValidation) {
          state.currentValidation.documentResults.forEach(doc => {
            const ref = doc.references.find(r => r.id === referenceId);
            if (ref) {
              ref.status = 'valid';
              ref.validationError = undefined;
              ref.suggestedFix = undefined;
              doc.brokenCount = doc.references.filter(r => r.status === 'broken').length;
              doc.warningCount = doc.references.filter(r => r.status === 'warning').length;
              doc.validCount = doc.references.filter(r => r.status === 'valid').length;
            }
          });
          
          state.currentValidation.brokenCount = state.currentValidation.documentResults
            .reduce((sum, d) => sum + d.brokenCount, 0);
          state.currentValidation.warningCount = state.currentValidation.documentResults
            .reduce((sum, d) => sum + d.warningCount, 0);
          state.currentValidation.validCount = state.currentValidation.documentResults
            .reduce((sum, d) => sum + d.validCount, 0);
        }
      });
      
      return true;
    },
    
    applyAllAutoFixes: async () => {
      const fixes = Array.from(get().pendingFixes.entries())
        .filter(([_, fix]) => fix.autoFixable);
      
      let applied = 0;
      for (const [refId] of fixes) {
        const success = await get().applyFix(refId);
        if (success) applied++;
      }
      
      return applied;
    },
    
    dismissFix: (referenceId) => {
      set(state => {
        state.pendingFixes.delete(referenceId);
      });
    },
    
    // Export
    generateReport: () => {
      const validation = get().currentValidation;
      if (!validation) return null;
      
      const allIssues = validation.documentResults.flatMap(d => 
        d.references.filter(r => r.status !== 'valid')
      );
      
      // Group by module
      const issuesByModule = new Map<string, CrossReference[]>();
      allIssues.forEach(issue => {
        const existing = issuesByModule.get(issue.sourceModule) || [];
        issuesByModule.set(issue.sourceModule, [...existing, issue]);
      });
      
      return {
        title: `eCTD Link Validation Report - Sequence ${validation.sequenceNumber}`,
        generatedAt: new Date().toISOString(),
        summary: {
          sequenceNumber: validation.sequenceNumber,
          applicationNumber: validation.applicationNumber,
          totalDocuments: validation.totalDocuments,
          totalReferences: validation.totalReferences,
          validCount: validation.validCount,
          issueCount: validation.brokenCount + validation.warningCount,
          passRate: validation.totalReferences > 0 
            ? Math.round((validation.validCount / validation.totalReferences) * 100) 
            : 100,
        },
        issuesByCategory: [{
          category: 'link-integrity' as const,
          count: allIssues.length,
          issues: allIssues.map(i => ({
            rule: 'link-target-exists',
            severity: i.status === 'broken' ? 'error' : 'warning',
            document: i.sourceDocumentTitle,
            details: i.validationError || '',
          })),
        }],
        issuesByModule: Array.from(issuesByModule.entries()).map(([module, issues]) => ({
          module,
          count: issues.length,
          documents: Array.from(new Set(issues.map(i => i.sourceDocumentTitle))),
        })),
        findings: allIssues,
      };
    },
    
    exportToCsv: () => {
      const validation = get().currentValidation;
      if (!validation) return '';
      
      const headers = ['Document', 'Module', 'Section', 'Link Text', 'Target Path', 'Status', 'Error', 'Suggested Fix'].join(',');
      
      const rows = validation.documentResults.flatMap(doc =>
        doc.references.map(ref => [
          `"${ref.sourceDocumentTitle}"`,
          ref.sourceModule,
          ref.sourceSection || '',
          `"${ref.linkText}"`,
          `"${ref.targetPath}"`,
          ref.status,
          `"${ref.validationError || ''}"`,
          `"${ref.suggestedFix?.description || ''}"`,
        ].join(','))
      );
      
      return [headers, ...rows].join('\n');
    },
    
    // Computed helpers
    getFilteredReferences: () => {
      const state = get();
      if (!state.currentValidation) return [];
      
      let refs = state.currentValidation.documentResults.flatMap(d => d.references);
      
      if (state.statusFilter !== 'all') {
        refs = refs.filter(r => r.status === state.statusFilter);
      }
      
      if (state.moduleFilter) {
        refs = refs.filter(r => r.sourceModule === state.moduleFilter);
      }
      
      if (state.typeFilter !== 'all') {
        refs = refs.filter(r => r.linkType === state.typeFilter);
      }
      
      return refs;
    },
    
    getIssuesByModule: () => {
      const validation = get().currentValidation;
      if (!validation) return new Map();
      
      const result = new Map<string, CrossReference[]>();
      validation.documentResults.forEach(doc => {
        const issues = doc.references.filter(r => r.status !== 'valid');
        if (issues.length > 0) {
          const existing = result.get(doc.module) || [];
          result.set(doc.module, [...existing, ...issues]);
        }
      });
      
      return result;
    },
    
    getAutoFixableCount: () => {
      let count = 0;
      get().pendingFixes.forEach(fix => {
        if (fix.autoFixable) count++;
      });
      return count;
    },
    
    reset: () => {
      set(state => {
        state.currentValidation = null;
        state.documentValidations = new Map();
        state.isValidating = false;
        state.validationProgress = null;
        state.validationError = null;
        state.selectedDocumentId = null;
        state.selectedReferenceId = null;
        state.pendingFixes = new Map();
        state.appliedFixes = [];
      });
    },
  }))
);

export default useECTDLinkValidationStore;
