

// =============================================================================
// CROSS-REFERENCE VALIDATION STORE - v0.9.17d
// =============================================================================
// Zustand store for eCTD cross-reference validation, broken link detection,
// and auto-fix functionality
// =============================================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import {
  CrossReferenceId,
  ECTDCrossReference,
  CrossReferenceIssue,
  DocumentValidationResult,
  SequenceValidationResult,
  CrossReferenceValidationJob,
  AutoFixJob,
  AutoFixResult,
  AutoFixSuggestion,
  CrossReferenceFilters,
  CrossReferenceStatistics,
  CrossReferenceValidationState,
  CrossReferenceValidationActions,
  HyperlinkType,
  ReferenceStatus,
  IssueCategory,
  ValidationSeverity,
  DEFAULT_CROSS_REFERENCE_FILTERS,
  CROSS_REFERENCE_RULES,
  generateCrossReferenceId,
  generateIssueId,
  generateJobId,
} from './cross-reference-validation-types';

// =============================================================================
// Sample Mock Data
// =============================================================================

const createSampleReferences = (): Record<CrossReferenceId, ECTDCrossReference> => {
  const now = new Date().toISOString();
  return {
    'xref-001': {
      id: 'xref-001',
      sourceDocumentId: 'doc-m2-5-clinical-overview',
      sourceDocumentPath: 'm2/25-clin-over/clinical-overview.pdf',
      sourceDocumentTitle: 'Clinical Overview',
      sourceLocation: { pageNumber: 12, sectionId: 'sec-2.5.4' },
      linkText: 'See Clinical Summary Section 2.7.3',
      rawTarget: '../27-clin-sum/clinical-summary.pdf#sec-2.7.3',
      resolvedTarget: 'm2/27-clin-sum/clinical-summary.pdf#sec-2.7.3',
      linkType: 'intra-module',
      targetDocumentId: 'doc-m2-7-clinical-summary',
      targetDocumentPath: 'm2/27-clin-sum/clinical-summary.pdf',
      targetDocumentTitle: 'Clinical Summary',
      targetLocation: { anchor: 'sec-2.7.3', sectionId: '2.7.3' },
      status: 'valid',
      lastValidated: now,
      sequenceId: 'seq-0001',
      applicationId: 'app-nexavant-nda',
      ctdModule: 'm2',
      createdAt: now,
    },
    'xref-002': {
      id: 'xref-002',
      sourceDocumentId: 'doc-m2-7-clinical-summary',
      sourceDocumentPath: 'm2/27-clin-sum/clinical-summary.pdf',
      sourceDocumentTitle: 'Clinical Summary',
      sourceLocation: { pageNumber: 45, sectionId: 'sec-2.7.4.2' },
      linkText: 'Refer to Study Report CSR-301',
      rawTarget: '../../m5/53-clin-stud-rep/535-rep-effic-safety-stud/csr-301.pdf',
      resolvedTarget: 'm5/53-clin-stud-rep/535-rep-effic-safety-stud/csr-301.pdf',
      linkType: 'inter-module',
      targetDocumentId: 'doc-m5-csr-301',
      targetDocumentPath: 'm5/53-clin-stud-rep/535-rep-effic-safety-stud/csr-301.pdf',
      targetDocumentTitle: 'Clinical Study Report LIG-301',
      targetLocation: { pageNumber: 1 },
      status: 'valid',
      lastValidated: now,
      sequenceId: 'seq-0001',
      applicationId: 'app-nexavant-nda',
      ctdModule: 'm2',
      createdAt: now,
    },
    'xref-003': {
      id: 'xref-003',
      sourceDocumentId: 'doc-m2-5-clinical-overview',
      sourceDocumentPath: 'm2/25-clin-over/clinical-overview.pdf',
      sourceDocumentTitle: 'Clinical Overview',
      sourceLocation: { pageNumber: 8 },
      linkText: 'FDA Guidance Document',
      rawTarget: 'https://www.fda.gov/guidance/oncology-2024.pdf',
      linkType: 'external',
      status: 'external',
      errorMessage: 'External links are not allowed in eCTD documents',
      sequenceId: 'seq-0001',
      applicationId: 'app-nexavant-nda',
      ctdModule: 'm2',
      createdAt: now,
    },
    'xref-004': {
      id: 'xref-004',
      sourceDocumentId: 'doc-m3-qos',
      sourceDocumentPath: 'm3/32-body-data/32s-drug-sub/drug-substance-spec.pdf',
      sourceDocumentTitle: 'Drug Substance Specification',
      sourceLocation: { pageNumber: 3 },
      linkText: 'See Analytical Methods',
      rawTarget: '../analytical-methods.pdf',
      resolvedTarget: 'm3/32-body-data/analytical-methods.pdf',
      linkType: 'intra-module',
      status: 'broken',
      errorMessage: 'Target file not found: m3/32-body-data/analytical-methods.pdf',
      sequenceId: 'seq-0001',
      applicationId: 'app-nexavant-nda',
      ctdModule: 'm3',
      createdAt: now,
    },
    'xref-005': {
      id: 'xref-005',
      sourceDocumentId: 'doc-m4-nonclin-overview',
      sourceDocumentPath: 'm4/42-study-rep/421-pharmacol/pk-study-report.pdf',
      sourceDocumentTitle: 'PK Study Report',
      sourceLocation: { pageNumber: 22 },
      linkText: 'Toxicology Report',
      rawTarget: '../423-tox/tox-study.pdf',
      resolvedTarget: 'm4/42-study-rep/423-tox/tox-study.pdf',
      linkType: 'intra-module',
      targetDocumentId: 'doc-m4-tox-study',
      targetDocumentPath: 'm4/42-study-rep/423-tox/tox-study.pdf',
      targetDocumentTitle: 'Toxicology Study Report',
      status: 'valid',
      lastValidated: now,
      sequenceId: 'seq-0001',
      applicationId: 'app-nexavant-nda',
      ctdModule: 'm4',
      createdAt: now,
    },
    'xref-006': {
      id: 'xref-006',
      sourceDocumentId: 'doc-m5-csr-301',
      sourceDocumentPath: 'm5/53-clin-stud-rep/535-rep-effic-safety-stud/csr-301.pdf',
      sourceDocumentTitle: 'Clinical Study Report LIG-301',
      sourceLocation: { pageNumber: 156 },
      linkText: 'Protocol Amendment 2',
      rawTarget: 'protocol-amendment-2.pdf#bookmark-section-5',
      resolvedTarget: 'm5/53-clin-stud-rep/535-rep-effic-safety-stud/protocol-amendment-2.pdf#bookmark-section-5',
      linkType: 'bookmark',
      targetDocumentId: 'doc-protocol-amend-2',
      targetDocumentPath: 'm5/53-clin-stud-rep/535-rep-effic-safety-stud/protocol-amendment-2.pdf',
      targetDocumentTitle: 'Protocol Amendment 2',
      targetLocation: { anchor: 'bookmark-section-5' },
      status: 'warning',
      errorMessage: 'Bookmark destination "bookmark-section-5" may not exist in target document',
      lastValidated: now,
      sequenceId: 'seq-0001',
      applicationId: 'app-nexavant-nda',
      ctdModule: 'm5',
      createdAt: now,
    },
    'xref-007': {
      id: 'xref-007',
      sourceDocumentId: 'doc-m2-7-clinical-summary',
      sourceDocumentPath: 'm2/27-clin-sum/clinical-summary.pdf',
      sourceDocumentTitle: 'Clinical Summary',
      sourceLocation: { pageNumber: 78 },
      linkText: 'Module 2.4 Nonclinical Overview',
      rawTarget: '../24-nonclin-over/Nonclinical-Overview.pdf',
      resolvedTarget: 'm2/24-nonclin-over/Nonclinical-Overview.pdf',
      linkType: 'intra-module',
      status: 'warning',
      errorMessage: 'Case mismatch: file is "nonclinical-overview.pdf" not "Nonclinical-Overview.pdf"',
      sequenceId: 'seq-0001',
      applicationId: 'app-nexavant-nda',
      ctdModule: 'm2',
      createdAt: now,
    },
    'xref-008': {
      id: 'xref-008',
      sourceDocumentId: 'doc-m1-cover-letter',
      sourceDocumentPath: 'm1/us/12-cover/cover-letter.pdf',
      sourceDocumentTitle: 'Cover Letter',
      sourceLocation: { pageNumber: 1 },
      linkText: 'Table of Contents',
      rawTarget: '../us-regional.xml#toc',
      resolvedTarget: 'm1/us/us-regional.xml#toc',
      linkType: 'toc',
      targetDocumentId: 'doc-m1-regional-xml',
      targetDocumentPath: 'm1/us/us-regional.xml',
      targetDocumentTitle: 'US Regional XML',
      targetLocation: { anchor: 'toc' },
      status: 'valid',
      lastValidated: now,
      sequenceId: 'seq-0001',
      applicationId: 'app-nexavant-nda',
      ctdModule: 'm1',
      createdAt: now,
    },
  };
};

const createSampleIssues = (): Record<string, CrossReferenceIssue> => {
  const now = new Date().toISOString();
  return {
    'issue-001': {
      id: 'issue-001',
      referenceId: 'xref-003',
      category: 'external-link',
      severity: 'error',
      message: 'External hyperlink detected in eCTD document',
      details: 'Link to https://www.fda.gov is not allowed. External references must be removed or replaced with internal document references.',
      affectedPath: 'm2/25-clin-over/clinical-overview.pdf',
      location: { pageNumber: 8 },
      ruleId: 'XREF-001',
      ruleName: 'No External Links',
      region: 'FDA',
      canAutoFix: true,
      suggestedFix: {
        action: 'remove-external',
        description: 'Remove external link and convert to plain text',
        originalValue: 'https://www.fda.gov/guidance/oncology-2024.pdf',
        proposedValue: '[Reference: FDA Guidance for Industry: Oncology 2024]',
        confidence: 85,
        risks: ['Link text will remain but will no longer be clickable'],
      },
      detectedAt: now,
    },
    'issue-002': {
      id: 'issue-002',
      referenceId: 'xref-004',
      category: 'missing-target',
      severity: 'error',
      message: 'Target document not found',
      details: 'The referenced file "analytical-methods.pdf" does not exist in the eCTD structure at path m3/32-body-data/',
      affectedPath: 'm3/32-body-data/32s-drug-sub/drug-substance-spec.pdf',
      location: { pageNumber: 3 },
      ruleId: 'XREF-002',
      ruleName: 'Valid Target Path',
      region: 'FDA',
      canAutoFix: true,
      suggestedFix: {
        action: 'update-path',
        description: 'Update path to existing file with similar name',
        originalValue: '../analytical-methods.pdf',
        proposedValue: '../32p-drug-prod/analytical-procedures.pdf',
        confidence: 72,
        risks: ['Verify this is the correct target document'],
      },
      detectedAt: now,
    },
    'issue-003': {
      id: 'issue-003',
      referenceId: 'xref-006',
      category: 'invalid-anchor',
      severity: 'warning',
      message: 'Bookmark destination may not exist',
      details: 'The bookmark "bookmark-section-5" could not be verified in the target PDF',
      affectedPath: 'm5/53-clin-stud-rep/535-rep-effic-safety-stud/csr-301.pdf',
      location: { pageNumber: 156 },
      ruleId: 'XREF-005',
      ruleName: 'Valid Bookmark Anchors',
      region: 'FDA',
      canAutoFix: true,
      suggestedFix: {
        action: 'update-anchor',
        description: 'Update to valid bookmark name',
        originalValue: 'bookmark-section-5',
        proposedValue: 'section-5-amendments',
        confidence: 65,
        risks: ['Manual verification recommended'],
      },
      detectedAt: now,
    },
    'issue-004': {
      id: 'issue-004',
      referenceId: 'xref-007',
      category: 'case-mismatch',
      severity: 'warning',
      message: 'File path case does not match actual file',
      details: 'Reference uses "Nonclinical-Overview.pdf" but actual file is "nonclinical-overview.pdf"',
      affectedPath: 'm2/27-clin-sum/clinical-summary.pdf',
      location: { pageNumber: 78 },
      ruleId: 'XREF-004',
      ruleName: 'Case Sensitivity',
      region: 'FDA',
      canAutoFix: true,
      suggestedFix: {
        action: 'fix-case',
        description: 'Correct file path case to match actual file',
        originalValue: '../24-nonclin-over/Nonclinical-Overview.pdf',
        proposedValue: '../24-nonclin-over/nonclinical-overview.pdf',
        confidence: 100,
      },
      detectedAt: now,
    },
  };
};

// =============================================================================
// Initial State
// =============================================================================

const initialState: CrossReferenceValidationState = {
  references: createSampleReferences(),
  issues: createSampleIssues(),
  documentResults: {},
  sequenceResults: {},
  validationJobs: {},
  autoFixJobs: {},
  selectedReferenceId: null,
  selectedIssueId: null,
  filters: DEFAULT_CROSS_REFERENCE_FILTERS,
  expandedDocuments: new Set(),
  statistics: null,
  isValidating: false,
  isApplyingFix: false,
  error: null,
};

// =============================================================================
// Store
// =============================================================================

export const useCrossReferenceValidationStore = create<
  CrossReferenceValidationState & CrossReferenceValidationActions
>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // =========================================================================
      // Validation Methods
      // =========================================================================

      validateDocument: async (documentId: string, documentPath: string, content?: string): Promise<DocumentValidationResult> => {
        set({ isValidating: true, error: null });

        try {
          // Simulate validation delay
          await new Promise(resolve => setTimeout(resolve, 300));

          const { references, issues } = get();
          const docRefs = Object.values(references).filter(r => r.sourceDocumentId === documentId);
          const docIssues = Object.values(issues).filter(i => {
            const ref = references[i.referenceId];
            return ref?.sourceDocumentId === documentId;
          });

          const result: DocumentValidationResult = {
            documentId,
            documentPath,
            documentTitle: docRefs[0]?.sourceDocumentTitle || 'Unknown Document',
            totalReferences: docRefs.length,
            validCount: docRefs.filter(r => r.status === 'valid').length,
            brokenCount: docRefs.filter(r => r.status === 'broken').length,
            warningCount: docRefs.filter(r => r.status === 'warning').length,
            externalCount: docRefs.filter(r => r.status === 'external').length,
            issues: docIssues,
            references: docRefs,
            validatedAt: new Date().toISOString(),
            validationDuration: 300,
            overallStatus: docIssues.some(i => i.severity === 'error') 
              ? 'failed' 
              : docIssues.some(i => i.severity === 'warning') 
                ? 'warning' 
                : 'passed',
          };

          set(state => ({
            documentResults: {
              ...state.documentResults,
              [documentId]: result,
            },
            isValidating: false,
          }));

          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Validation failed';
          set({ error: errorMessage, isValidating: false });
          throw error;
        }
      },

      validateSequence: async (sequenceId: string, documentIds: string[]): Promise<SequenceValidationResult> => {
        set({ isValidating: true, error: null });

        try {
          const startTime = Date.now();
          const { references, issues } = get();
          
          // Collect all references and issues for the sequence
          const seqRefs = Object.values(references).filter(r => r.sequenceId === sequenceId);
          const seqIssues = Object.values(issues).filter(i => {
            const ref = references[i.referenceId];
            return ref?.sequenceId === sequenceId;
          });

          // Calculate totals
          const issuesByCategory: Record<IssueCategory, number> = {} as Record<IssueCategory, number>;
          const issuesBySeverity: Record<ValidationSeverity, number> = { error: 0, warning: 0, info: 0 };
          const issuesByModule: Record<string, number> = {};

          seqIssues.forEach(issue => {
            issuesByCategory[issue.category] = (issuesByCategory[issue.category] || 0) + 1;
            issuesBySeverity[issue.severity]++;
            const ref = references[issue.referenceId];
            if (ref?.ctdModule) {
              issuesByModule[ref.ctdModule] = (issuesByModule[ref.ctdModule] || 0) + 1;
            }
          });

          const result: SequenceValidationResult = {
            sequenceId,
            sequenceNumber: '0001',
            applicationId: seqRefs[0]?.applicationId || '',
            applicationNumber: 'NDA-NEXAVANT-001',
            documentsValidated: documentIds.length,
            totalReferences: seqRefs.length,
            validCount: seqRefs.filter(r => r.status === 'valid').length,
            brokenCount: seqRefs.filter(r => r.status === 'broken').length,
            warningCount: seqRefs.filter(r => r.status === 'warning').length,
            externalCount: seqRefs.filter(r => r.status === 'external').length,
            circularCount: seqRefs.filter(r => r.status === 'circular').length,
            orphanCount: seqRefs.filter(r => r.status === 'orphan').length,
            issuesByCategory,
            issuesBySeverity,
            issuesByModule,
            documentResults: [],
            allIssues: seqIssues,
            autoFixableCount: seqIssues.filter(i => i.canAutoFix).length,
            validatedAt: new Date().toISOString(),
            validationDuration: Date.now() - startTime,
            complianceScore: Math.round(
              ((seqRefs.filter(r => r.status === 'valid').length / Math.max(seqRefs.length, 1)) * 100)
            ),
            overallStatus: seqIssues.some(i => i.severity === 'error') 
              ? 'failed' 
              : seqIssues.some(i => i.severity === 'warning') 
                ? 'warning' 
                : 'passed',
          };

          set(state => ({
            sequenceResults: {
              ...state.sequenceResults,
              [sequenceId]: result,
            },
            isValidating: false,
          }));

          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Validation failed';
          set({ error: errorMessage, isValidating: false });
          throw error;
        }
      },

      validateBatch: async (sequenceIds: string[]): Promise<string> => {
        const jobId = generateJobId();
        
        const job: CrossReferenceValidationJob = {
          id: jobId,
          status: 'pending',
          progress: 0,
          sequenceIds,
          documentIds: [],
          completedDocuments: 0,
          totalDocuments: sequenceIds.length * 10, // Estimate
        };

        set(state => ({
          validationJobs: { ...state.validationJobs, [jobId]: job },
        }));

        // Start async validation
        (async () => {
          set(state => ({
            validationJobs: {
              ...state.validationJobs,
              [jobId]: { ...state.validationJobs[jobId], status: 'running', startedAt: new Date().toISOString() },
            },
          }));

          const results: SequenceValidationResult[] = [];
          
          for (let i = 0; i < sequenceIds.length; i++) {
            try {
              const result = await get().validateSequence(sequenceIds[i], []);
              results.push(result);
              
              set(state => ({
                validationJobs: {
                  ...state.validationJobs,
                  [jobId]: {
                    ...state.validationJobs[jobId],
                    progress: Math.round(((i + 1) / sequenceIds.length) * 100),
                    completedDocuments: i + 1,
                  },
                },
              }));
            } catch {
              // Continue with other sequences
            }
          }

          set(state => ({
            validationJobs: {
              ...state.validationJobs,
              [jobId]: {
                ...state.validationJobs[jobId],
                status: 'completed',
                progress: 100,
                completedAt: new Date().toISOString(),
                results,
              },
            },
          }));
        })();

        return jobId;
      },

      cancelValidation: (jobId: string) => {
        set(state => ({
          validationJobs: {
            ...state.validationJobs,
            [jobId]: { ...state.validationJobs[jobId], status: 'cancelled' },
          },
        }));
      },

      // =========================================================================
      // Issue Management
      // =========================================================================

      acknowledgeIssue: (issueId: string, userId: string) => {
        set(state => ({
          issues: {
            ...state.issues,
            [issueId]: {
              ...state.issues[issueId],
              acknowledged: true,
              acknowledgedBy: userId,
              acknowledgedAt: new Date().toISOString(),
            },
          },
        }));
      },

      unacknowledgeIssue: (issueId: string) => {
        set(state => ({
          issues: {
            ...state.issues,
            [issueId]: {
              ...state.issues[issueId],
              acknowledged: false,
              acknowledgedBy: undefined,
              acknowledgedAt: undefined,
            },
          },
        }));
      },

      dismissIssue: (issueId: string) => {
        set(state => {
          const { [issueId]: _, ...remaining } = state.issues;
          return { issues: remaining };
        });
      },

      // =========================================================================
      // Auto-Fix Methods
      // =========================================================================

      applyFix: async (issueId: string, userId: string): Promise<AutoFixResult> => {
        set({ isApplyingFix: true, error: null });

        try {
          const { issues, references } = get();
          const issue = issues[issueId];
          
          if (!issue || !issue.suggestedFix) {
            throw new Error('Issue not found or no fix available');
          }

          // Simulate fix application
          await new Promise(resolve => setTimeout(resolve, 200));

          const result: AutoFixResult = {
            issueId,
            referenceId: issue.referenceId,
            success: true,
            action: issue.suggestedFix.action,
            originalValue: issue.suggestedFix.originalValue,
            newValue: issue.suggestedFix.proposedValue,
            appliedAt: new Date().toISOString(),
            appliedBy: userId,
          };

          // Update the reference status
          set(state => {
            const ref = state.references[issue.referenceId];
            const { [issueId]: _, ...remainingIssues } = state.issues;
            
            return {
              references: ref ? {
                ...state.references,
                [issue.referenceId]: {
                  ...ref,
                  status: 'valid' as ReferenceStatus,
                  rawTarget: issue.suggestedFix?.proposedValue || ref.rawTarget,
                  errorMessage: undefined,
                },
              } : state.references,
              issues: remainingIssues,
              isApplyingFix: false,
            };
          });

          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Fix failed';
          set({ error: errorMessage, isApplyingFix: false });
          throw error;
        }
      },

      applyFixBatch: async (issueIds: string[], userId: string): Promise<string> => {
        const jobId = generateJobId();
        
        const job: AutoFixJob = {
          id: jobId,
          status: 'pending',
          progress: 0,
          issueIds,
          fixedCount: 0,
          failedCount: 0,
          skippedCount: 0,
          fixResults: [],
        };

        set(state => ({
          autoFixJobs: { ...state.autoFixJobs, [jobId]: job },
        }));

        // Start async fix
        (async () => {
          set(state => ({
            autoFixJobs: {
              ...state.autoFixJobs,
              [jobId]: { ...state.autoFixJobs[jobId], status: 'running', startedAt: new Date().toISOString() },
            },
          }));

          const results: AutoFixResult[] = [];
          let fixedCount = 0;
          let failedCount = 0;
          
          for (let i = 0; i < issueIds.length; i++) {
            try {
              const result = await get().applyFix(issueIds[i], userId);
              results.push(result);
              if (result.success) fixedCount++;
              else failedCount++;
            } catch {
              failedCount++;
              results.push({
                issueId: issueIds[i],
                referenceId: '',
                success: false,
                action: 'update-path',
                originalValue: '',
                error: 'Fix failed',
                appliedAt: new Date().toISOString(),
                appliedBy: userId,
              });
            }
            
            set(state => ({
              autoFixJobs: {
                ...state.autoFixJobs,
                [jobId]: {
                  ...state.autoFixJobs[jobId],
                  progress: Math.round(((i + 1) / issueIds.length) * 100),
                  fixedCount,
                  failedCount,
                  fixResults: results,
                },
              },
            }));
          }

          set(state => ({
            autoFixJobs: {
              ...state.autoFixJobs,
              [jobId]: {
                ...state.autoFixJobs[jobId],
                status: 'completed',
                progress: 100,
                completedAt: new Date().toISOString(),
                fixedCount,
                failedCount,
                fixResults: results,
              },
            },
          }));
        })();

        return jobId;
      },

      previewFix: (issueId: string): AutoFixSuggestion | null => {
        const { issues } = get();
        return issues[issueId]?.suggestedFix || null;
      },

      // =========================================================================
      // CRUD Methods
      // =========================================================================

      addReference: (reference) => {
        const id = generateCrossReferenceId();
        const newRef: ECTDCrossReference = {
          ...reference,
          id,
          createdAt: new Date().toISOString(),
        };
        
        set(state => ({
          references: { ...state.references, [id]: newRef },
        }));
        
        return id;
      },

      updateReference: (id, updates) => {
        set(state => ({
          references: {
            ...state.references,
            [id]: { ...state.references[id], ...updates },
          },
        }));
      },

      deleteReference: (id) => {
        set(state => {
          const { [id]: _, ...remaining } = state.references;
          return { references: remaining };
        });
      },

      clearAllReferences: () => {
        set({ references: {}, issues: {}, documentResults: {}, sequenceResults: {} });
      },

      // =========================================================================
      // Query Methods
      // =========================================================================

      getReferencesForDocument: (documentId) => {
        const { references } = get();
        return Object.values(references).filter(r => r.sourceDocumentId === documentId);
      },

      getIssuesForDocument: (documentId) => {
        const { issues, references } = get();
        return Object.values(issues).filter(i => {
          const ref = references[i.referenceId];
          return ref?.sourceDocumentId === documentId;
        });
      },

      getBrokenReferences: () => {
        const { references } = get();
        return Object.values(references).filter(r => r.status === 'broken' || r.status === 'external');
      },

      getAutoFixableIssues: () => {
        const { issues } = get();
        return Object.values(issues).filter(i => i.canAutoFix);
      },

      getOrphanDocuments: () => {
        const { references } = get();
        const targetedDocs = new Set(Object.values(references).map(r => r.targetDocumentId).filter(Boolean));
        const sourceDocs = new Set(Object.values(references).map(r => r.sourceDocumentId));
        return Array.from(sourceDocs).filter(d => !targetedDocs.has(d));
      },

      // =========================================================================
      // UI State Methods
      // =========================================================================

      setSelectedReference: (id) => set({ selectedReferenceId: id }),
      setSelectedIssue: (id) => set({ selectedIssueId: id }),
      
      setFilters: (filters) => {
        set(state => ({
          filters: { ...state.filters, ...filters },
        }));
      },

      resetFilters: () => set({ filters: DEFAULT_CROSS_REFERENCE_FILTERS }),

      toggleDocumentExpanded: (documentId) => {
        set(state => {
          const newExpanded = new Set(state.expandedDocuments);
          if (newExpanded.has(documentId)) {
            newExpanded.delete(documentId);
          } else {
            newExpanded.add(documentId);
          }
          return { expandedDocuments: newExpanded };
        });
      },

      // =========================================================================
      // Statistics
      // =========================================================================

      refreshStatistics: () => {
        const { references, issues } = get();
        const refList = Object.values(references);
        const issueList = Object.values(issues);

        const byStatus: Record<ReferenceStatus, number> = {
          valid: 0, broken: 0, warning: 0, external: 0, circular: 0, orphan: 0, pending: 0,
        };
        const byLinkType: Record<HyperlinkType, number> = {
          internal: 0, 'intra-module': 0, 'inter-module': 0, external: 0, bookmark: 0, toc: 0, xref: 0,
        };

        refList.forEach(ref => {
          byStatus[ref.status]++;
          byLinkType[ref.linkType]++;
        });

        const issuesByCategory: Record<IssueCategory, number> = {} as Record<IssueCategory, number>;
        const issuesBySeverity: Record<ValidationSeverity, number> = { error: 0, warning: 0, info: 0 };

        issueList.forEach(issue => {
          issuesByCategory[issue.category] = (issuesByCategory[issue.category] || 0) + 1;
          issuesBySeverity[issue.severity]++;
        });

        const documentsWithIssues = new Set(
          issueList.map(i => references[i.referenceId]?.sourceDocumentId).filter(Boolean)
        ).size;

        const totalDocuments = new Set(refList.map(r => r.sourceDocumentId)).size;
        const validCount = byStatus.valid;
        const healthScore = refList.length > 0 
          ? Math.round((validCount / refList.length) * 100) 
          : 100;

        const stats: CrossReferenceStatistics = {
          totalReferences: refList.length,
          byStatus,
          byLinkType,
          issuesByCategory,
          issuesBySeverity,
          autoFixableCount: issueList.filter(i => i.canAutoFix).length,
          fixedCount: 0,
          documentsWithIssues,
          totalDocuments,
          healthScore,
          lastValidated: new Date().toISOString(),
        };

        set({ statistics: stats });
      },

      // =========================================================================
      // Reset
      // =========================================================================

      reset: () => set(initialState),
    }),
    { name: 'CrossReferenceValidationStore' }
  )
);

// =============================================================================
// Selector Hooks
// =============================================================================

/** Get selected reference */
export const useSelectedCrossReference = () => 
  useCrossReferenceValidationStore(useShallow(state => {
    const id = state.selectedReferenceId;
    return id ? state.references[id] : null;
  }));

/** Get selected issue */
export const useSelectedCrossReferenceIssue = () => 
  useCrossReferenceValidationStore(useShallow(state => {
    const id = state.selectedIssueId;
    return id ? state.issues[id] : null;
  }));

/** Get all references as array */
export const useCrossReferenceList = () => 
  useCrossReferenceValidationStore(useShallow(state => Object.values(state.references)));

/** Get all issues as array */
export const useCrossReferenceIssueList = () => 
  useCrossReferenceValidationStore(useShallow(state => Object.values(state.issues)));

/** Get filtered references */
export const useFilteredCrossReferences = () => 
  useCrossReferenceValidationStore(useShallow(state => {
    let refs = Object.values(state.references);
    const f = state.filters;
    
    if (f.status?.length) refs = refs.filter(r => f.status!.includes(r.status));
    if (f.linkType?.length) refs = refs.filter(r => f.linkType!.includes(r.linkType));
    if (f.ctdModule?.length) refs = refs.filter(r => r.ctdModule && f.ctdModule!.includes(r.ctdModule));
    if (f.documentId) refs = refs.filter(r => r.sourceDocumentId === f.documentId);
    if (f.sequenceId) refs = refs.filter(r => r.sequenceId === f.sequenceId);
    if (f.applicationId) refs = refs.filter(r => r.applicationId === f.applicationId);
    if (f.searchQuery) {
      const q = f.searchQuery.toLowerCase();
      refs = refs.filter(r => 
        r.linkText.toLowerCase().includes(q) ||
        r.rawTarget.toLowerCase().includes(q) ||
        r.sourceDocumentTitle.toLowerCase().includes(q)
      );
    }
    
    return refs;
  }));

/** Get filtered issues */
export const useFilteredCrossReferenceIssues = () => 
  useCrossReferenceValidationStore(useShallow(state => {
    let issues = Object.values(state.issues);
    const f = state.filters;
    
    if (f.issueCategory?.length) issues = issues.filter(i => f.issueCategory!.includes(i.category));
    if (f.severity?.length) issues = issues.filter(i => f.severity!.includes(i.severity));
    if (f.onlyAutoFixable) issues = issues.filter(i => i.canAutoFix);
    if (f.onlyUnacknowledged) issues = issues.filter(i => !i.acknowledged);
    
    return issues;
  }));

/** Get broken references */
export const useBrokenCrossReferences = () => 
  useCrossReferenceValidationStore(useShallow(state => 
    Object.values(state.references).filter(r => r.status === 'broken' || r.status === 'external')
  ));

/** Get auto-fixable issues */
export const useAutoFixableIssues = () => 
  useCrossReferenceValidationStore(useShallow(state => 
    Object.values(state.issues).filter(i => i.canAutoFix)
  ));

/** Get statistics */
export const useCrossReferenceStatistics = () => 
  useCrossReferenceValidationStore(state => state.statistics);

/** Get loading states */
export const useCrossReferenceValidating = () => 
  useCrossReferenceValidationStore(state => state.isValidating);

export const useCrossReferenceApplyingFix = () => 
  useCrossReferenceValidationStore(state => state.isApplyingFix);

/** Get filters */
export const useCrossReferenceFilters = () => 
  useCrossReferenceValidationStore(state => state.filters);

/** Get validation jobs */
export const useCrossReferenceValidationJobs = () => 
  useCrossReferenceValidationStore(useShallow(state => Object.values(state.validationJobs)));

/** Get auto-fix jobs */
export const useCrossReferenceAutoFixJobs = () => 
  useCrossReferenceValidationStore(useShallow(state => Object.values(state.autoFixJobs)));

export default useCrossReferenceValidationStore;
