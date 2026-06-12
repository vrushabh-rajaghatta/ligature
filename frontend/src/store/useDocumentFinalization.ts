


import { create } from 'zustand';
import { 
  CorrespondencePackage, 
  CorrespondenceStatus,
  useHAQCorrespondenceBridge 
} from './useHAQCorrespondenceBridge';
import { usePortfolioStore, Sequence } from '@/stores/portfolio-store';

// ============================================================================
// TYPES
// ============================================================================

export type FinalizationStep = 
  | 'draft'
  | 'content-review'
  | 'qc-checklist'
  | 'signature-collection'
  | 'pdf-generation'
  | 'final-review'
  | 'locked';

export type SignatureRole = 
  | 'author'
  | 'reviewer'
  | 'qa-lead'
  | 'regulatory-lead'
  | 'medical-officer';

export type SignatureStatus = 'pending' | 'signed' | 'declined';

export interface SignatureRequirement {
  id: string;
  role: SignatureRole;
  roleName: string;
  required: boolean;
  order: number;
  status: SignatureStatus;
  signerId?: string;
  signerName?: string;
  signedAt?: string;
  meaning: string;
  declineReason?: string;
}

export interface QCChecklistItem {
  id: string;
  category: 'content' | 'formatting' | 'compliance' | 'accuracy';
  name: string;
  description: string;
  status: 'pending' | 'passed' | 'failed' | 'na';
  checkedBy?: string;
  checkedAt?: string;
  notes?: string;
  severity: 'critical' | 'major' | 'minor';
}

export interface QCChecklistResult {
  packageId: string;
  completedAt: string;
  completedBy: string;
  overallStatus: 'passed' | 'failed' | 'passed-with-exceptions';
  items: QCChecklistItem[];
  comments: string;
  exceptions: string[];
}

export interface PDFGenerationConfig {
  includeTableOfContents: boolean;
  includeCoverPage: boolean;
  includeSignaturePage: boolean;
  paperSize: 'letter' | 'a4';
  headerText?: string;
  footerText?: string;
  watermark?: string;
  outputFormat: 'pdf' | 'pdf-a';
}

export interface GeneratedPDF {
  id: string;
  packageId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  pageCount: number;
  generatedAt: string;
  generatedBy: string;
  pdfVersion: string;
  isPdfA: boolean;
  checksum: string;
  validated: boolean;
  validationErrors: string[];
}

export interface FinalizationWorkflow {
  id: string;
  packageId: string;
  applicationId: string;
  applicationNumber: string;
  title: string;
  
  // Progress tracking
  currentStep: FinalizationStep;
  stepHistory: { step: FinalizationStep; timestamp: string; userId: string }[];
  
  // QC
  qcChecklist?: QCChecklistResult;
  
  // Signatures
  signatureRequirements: SignatureRequirement[];
  allSignaturesCollected: boolean;
  
  // PDF Generation
  pdfConfig?: PDFGenerationConfig;
  generatedPDF?: GeneratedPDF;
  
  // Cover Letter
  coverLetterGenerated: boolean;
  coverLetterPDF?: GeneratedPDF;
  
  // Sequence linkage
  targetSequenceId?: string;
  sequenceLocked: boolean;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  lockedAt?: string;
  
  // Metadata
  createdBy: string;
  lastModifiedBy: string;
}

// Default QC checklist items for IR responses
const DEFAULT_QC_ITEMS: Omit<QCChecklistItem, 'status' | 'checkedBy' | 'checkedAt' | 'notes'>[] = [
  { id: 'qc-resp-1', category: 'content', name: 'Response Completeness', description: 'All questions have been addressed with substantive responses', severity: 'critical' },
  { id: 'qc-resp-2', category: 'content', name: 'Technical Accuracy', description: 'Data and statements are technically accurate and supported', severity: 'critical' },
  { id: 'qc-resp-3', category: 'content', name: 'CTD References Valid', description: 'All CTD section references point to valid documents', severity: 'major' },
  { id: 'qc-resp-4', category: 'compliance', name: 'Regulatory Language', description: 'Language follows regulatory standards and guidelines', severity: 'major' },
  { id: 'qc-resp-5', category: 'compliance', name: 'Commitments Identified', description: 'Any commitments are clearly identified and tracked', severity: 'critical' },
  { id: 'qc-resp-6', category: 'formatting', name: 'Document Structure', description: 'Response follows standard formatting template', severity: 'minor' },
  { id: 'qc-resp-7', category: 'formatting', name: 'Tables & Figures', description: 'Tables and figures are properly formatted and labeled', severity: 'minor' },
  { id: 'qc-resp-8', category: 'accuracy', name: 'Cross-Reference Check', description: 'Internal cross-references are accurate', severity: 'major' },
  { id: 'qc-resp-9', category: 'accuracy', name: 'Spelling & Grammar', description: 'No spelling or grammatical errors', severity: 'minor' },
  { id: 'qc-resp-10', category: 'accuracy', name: 'Version Control', description: 'Correct version numbers and dates used', severity: 'major' },
];

// Default signature requirements for IR responses
const DEFAULT_SIGNATURE_REQUIREMENTS: Omit<SignatureRequirement, 'status' | 'signerId' | 'signerName' | 'signedAt' | 'declineReason'>[] = [
  { id: 'sig-1', role: 'author', roleName: 'Response Author', required: true, order: 1, meaning: 'I have authored this response and confirm its accuracy.' },
  { id: 'sig-2', role: 'reviewer', roleName: 'Technical Reviewer', required: true, order: 2, meaning: 'I have reviewed this response and confirm the technical content is accurate.' },
  { id: 'sig-3', role: 'qa-lead', roleName: 'QA Lead', required: true, order: 3, meaning: 'I have verified this response meets quality standards.' },
  { id: 'sig-4', role: 'regulatory-lead', roleName: 'Regulatory Lead', required: true, order: 4, meaning: 'I approve this response for submission to the regulatory agency.' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const generateId = (prefix: string): string => 
  `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const timestamp = (): string => new Date().toISOString();

// Simulate PDF generation (in real implementation, would call actual PDF service)
const simulatePDFGeneration = async (
  packageData: CorrespondencePackage,
  config: PDFGenerationConfig
): Promise<GeneratedPDF> => {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const pageCount = Math.ceil(packageData.responses.length * 2.5) + (config.includeCoverPage ? 1 : 0);
  const fileSize = pageCount * 45000 + Math.random() * 10000; // ~45KB per page
  
  return {
    id: generateId('pdf'),
    packageId: packageData.id,
    fileName: packageData.suggestedFileName,
    filePath: `/generated/${packageData.suggestedFileName}`,
    fileSize: Math.round(fileSize),
    pageCount,
    generatedAt: timestamp(),
    generatedBy: 'system',
    pdfVersion: config.outputFormat === 'pdf-a' ? 'PDF/A-2b' : 'PDF 1.7',
    isPdfA: config.outputFormat === 'pdf-a',
    checksum: `sha256-${Math.random().toString(36).substr(2, 16)}${Math.random().toString(36).substr(2, 16)}`,
    validated: true,
    validationErrors: [],
  };
};

// Generate cover letter PDF
const generateCoverLetterPDF = async (
  workflow: FinalizationWorkflow,
  coverLetterText: string
): Promise<GeneratedPDF> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  
  return {
    id: generateId('pdf'),
    packageId: workflow.packageId,
    fileName: `cover-letter-${workflow.applicationNumber.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.pdf`,
    filePath: `/generated/cover-letters/`,
    fileSize: 25000 + Math.random() * 5000,
    pageCount: 1,
    generatedAt: timestamp(),
    generatedBy: 'system',
    pdfVersion: 'PDF/A-2b',
    isPdfA: true,
    checksum: `sha256-${Math.random().toString(36).substr(2, 32)}`,
    validated: true,
    validationErrors: [],
  };
};

// ============================================================================
// STORE
// ============================================================================

interface DocumentFinalizationState {
  // Active workflows
  workflows: FinalizationWorkflow[];
  
  // Actions
  createWorkflow: (packageId: string, createdBy: string) => string | null;
  
  // Step progression
  advanceStep: (workflowId: string, userId: string) => boolean;
  revertStep: (workflowId: string, userId: string, reason: string) => boolean;
  
  // QC Checklist
  initializeQCChecklist: (workflowId: string) => void;
  updateQCItem: (workflowId: string, itemId: string, status: QCChecklistItem['status'], checkedBy: string, notes?: string) => void;
  completeQCChecklist: (workflowId: string, completedBy: string, comments: string) => QCChecklistResult | null;
  
  // Signatures
  collectSignature: (workflowId: string, signatureId: string, signerId: string, signerName: string) => boolean;
  declineSignature: (workflowId: string, signatureId: string, signerId: string, signerName: string, reason: string) => boolean;
  
  // PDF Generation
  configurePDFGeneration: (workflowId: string, config: PDFGenerationConfig) => void;
  generatePDF: (workflowId: string, generatedBy: string) => Promise<GeneratedPDF | null>;
  generateCoverLetter: (workflowId: string, coverLetterText: string) => Promise<GeneratedPDF | null>;
  
  // Sequence Lock
  linkToSequence: (workflowId: string, sequenceId: string) => void;
  lockForSubmission: (workflowId: string, lockedBy: string) => boolean;
  
  // Queries
  getWorkflow: (workflowId: string) => FinalizationWorkflow | undefined;
  getWorkflowByPackage: (packageId: string) => FinalizationWorkflow | undefined;
  getWorkflowsForApplication: (applicationId: string) => FinalizationWorkflow[];
  getPendingSignatures: (workflowId: string) => SignatureRequirement[];
  canAdvanceToStep: (workflowId: string, targetStep: FinalizationStep) => { canAdvance: boolean; blockers: string[] };
  
  // Cleanup
  deleteWorkflow: (workflowId: string) => void;
}

export const useDocumentFinalization = create<DocumentFinalizationState>()((set, get) => ({
  workflows: [],
  
  createWorkflow: (packageId, createdBy) => {
    const corrBridge = useHAQCorrespondenceBridge.getState();
    const pkg = corrBridge.getPackageById(packageId);
    
    if (!pkg) return null;
    
    // Check if workflow already exists
    if (get().workflows.some(w => w.packageId === packageId)) {
      return get().workflows.find(w => w.packageId === packageId)?.id || null;
    }
    
    const workflowId = generateId('fin-wf');
    const now = timestamp();
    
    const workflow: FinalizationWorkflow = {
      id: workflowId,
      packageId,
      applicationId: pkg.applicationId,
      applicationNumber: pkg.applicationNumber,
      title: pkg.title,
      
      currentStep: 'draft',
      stepHistory: [{ step: 'draft', timestamp: now, userId: createdBy }],
      
      signatureRequirements: DEFAULT_SIGNATURE_REQUIREMENTS.map(req => ({
        ...req,
        status: 'pending' as SignatureStatus,
      })),
      allSignaturesCollected: false,
      
      coverLetterGenerated: false,
      sequenceLocked: false,
      
      createdAt: now,
      updatedAt: now,
      createdBy,
      lastModifiedBy: createdBy,
    };
    
    set(state => ({
      workflows: [...state.workflows, workflow],
    }));
    
    return workflowId;
  },
  
  advanceStep: (workflowId, userId) => {
    const workflow = get().getWorkflow(workflowId);
    if (!workflow) return false;
    
    const stepOrder: FinalizationStep[] = [
      'draft',
      'content-review',
      'qc-checklist',
      'signature-collection',
      'pdf-generation',
      'final-review',
      'locked',
    ];
    
    const currentIndex = stepOrder.indexOf(workflow.currentStep);
    if (currentIndex === -1 || currentIndex >= stepOrder.length - 1) return false;
    
    const nextStep = stepOrder[currentIndex + 1];
    const { canAdvance, blockers } = get().canAdvanceToStep(workflowId, nextStep);
    
    if (!canAdvance) {
      console.warn('Cannot advance:', blockers);
      return false;
    }
    
    const now = timestamp();
    set(state => ({
      workflows: state.workflows.map(w =>
        w.id === workflowId
          ? {
              ...w,
              currentStep: nextStep,
              stepHistory: [...w.stepHistory, { step: nextStep, timestamp: now, userId }],
              updatedAt: now,
              lastModifiedBy: userId,
            }
          : w
      ),
    }));
    
    return true;
  },
  
  revertStep: (workflowId, userId, reason) => {
    const workflow = get().getWorkflow(workflowId);
    if (!workflow || workflow.currentStep === 'locked') return false;
    
    const stepOrder: FinalizationStep[] = [
      'draft',
      'content-review',
      'qc-checklist',
      'signature-collection',
      'pdf-generation',
      'final-review',
      'locked',
    ];
    
    const currentIndex = stepOrder.indexOf(workflow.currentStep);
    if (currentIndex <= 0) return false;
    
    const previousStep = stepOrder[currentIndex - 1];
    const now = timestamp();
    
    set(state => ({
      workflows: state.workflows.map(w =>
        w.id === workflowId
          ? {
              ...w,
              currentStep: previousStep,
              stepHistory: [...w.stepHistory, { step: previousStep, timestamp: now, userId }],
              updatedAt: now,
              lastModifiedBy: userId,
            }
          : w
      ),
    }));
    
    return true;
  },
  
  initializeQCChecklist: (workflowId) => {
    const workflow = get().getWorkflow(workflowId);
    if (!workflow) return;
    
    const items: QCChecklistItem[] = DEFAULT_QC_ITEMS.map(item => ({
      ...item,
      status: 'pending',
    }));
    
    set(state => ({
      workflows: state.workflows.map(w =>
        w.id === workflowId
          ? {
              ...w,
              qcChecklist: {
                packageId: w.packageId,
                completedAt: '',
                completedBy: '',
                overallStatus: 'passed',
                items,
                comments: '',
                exceptions: [],
              },
              updatedAt: timestamp(),
            }
          : w
      ),
    }));
  },
  
  updateQCItem: (workflowId, itemId, status, checkedBy, notes) => {
    const now = timestamp();
    
    set(state => ({
      workflows: state.workflows.map(w => {
        if (w.id !== workflowId || !w.qcChecklist) return w;
        
        return {
          ...w,
          qcChecklist: {
            ...w.qcChecklist,
            items: w.qcChecklist.items.map(item =>
              item.id === itemId
                ? { ...item, status, checkedBy, checkedAt: now, notes }
                : item
            ),
          },
          updatedAt: now,
        };
      }),
    }));
  },
  
  completeQCChecklist: (workflowId, completedBy, comments) => {
    const workflow = get().getWorkflow(workflowId);
    if (!workflow || !workflow.qcChecklist) return null;
    
    const items = workflow.qcChecklist.items;
    const failedCritical = items.filter(i => i.status === 'failed' && i.severity === 'critical');
    const failedMajor = items.filter(i => i.status === 'failed' && i.severity === 'major');
    const pending = items.filter(i => i.status === 'pending');
    
    if (pending.length > 0) return null; // Can't complete with pending items
    
    let overallStatus: QCChecklistResult['overallStatus'] = 'passed';
    const exceptions: string[] = [];
    
    if (failedCritical.length > 0) {
      overallStatus = 'failed';
      failedCritical.forEach(i => exceptions.push(`Critical: ${i.name}`));
    } else if (failedMajor.length > 0) {
      overallStatus = 'passed-with-exceptions';
      failedMajor.forEach(i => exceptions.push(`Major: ${i.name}`));
    }
    
    const now = timestamp();
    const result: QCChecklistResult = {
      packageId: workflow.packageId,
      completedAt: now,
      completedBy,
      overallStatus,
      items,
      comments,
      exceptions,
    };
    
    set(state => ({
      workflows: state.workflows.map(w =>
        w.id === workflowId
          ? {
              ...w,
              qcChecklist: result,
              updatedAt: now,
              lastModifiedBy: completedBy,
            }
          : w
      ),
    }));
    
    return result;
  },
  
  collectSignature: (workflowId, signatureId, signerId, signerName) => {
    const now = timestamp();
    
    set(state => ({
      workflows: state.workflows.map(w => {
        if (w.id !== workflowId) return w;
        
        const updatedRequirements = w.signatureRequirements.map(sig =>
          sig.id === signatureId
            ? { ...sig, status: 'signed' as SignatureStatus, signerId, signerName, signedAt: now }
            : sig
        );
        
        const allSigned = updatedRequirements
          .filter(s => s.required)
          .every(s => s.status === 'signed');
        
        return {
          ...w,
          signatureRequirements: updatedRequirements,
          allSignaturesCollected: allSigned,
          updatedAt: now,
          lastModifiedBy: signerId,
        };
      }),
    }));
    
    return true;
  },
  
  declineSignature: (workflowId, signatureId, signerId, signerName, reason) => {
    const now = timestamp();
    
    set(state => ({
      workflows: state.workflows.map(w =>
        w.id === workflowId
          ? {
              ...w,
              signatureRequirements: w.signatureRequirements.map(sig =>
                sig.id === signatureId
                  ? { ...sig, status: 'declined' as SignatureStatus, signerId, signerName, signedAt: now, declineReason: reason }
                  : sig
              ),
              updatedAt: now,
              lastModifiedBy: signerId,
            }
          : w
      ),
    }));
    
    return true;
  },
  
  configurePDFGeneration: (workflowId, config) => {
    set(state => ({
      workflows: state.workflows.map(w =>
        w.id === workflowId
          ? { ...w, pdfConfig: config, updatedAt: timestamp() }
          : w
      ),
    }));
  },
  
  generatePDF: async (workflowId, generatedBy) => {
    const workflow = get().getWorkflow(workflowId);
    if (!workflow) return null;
    
    const corrBridge = useHAQCorrespondenceBridge.getState();
    const pkg = corrBridge.getPackageById(workflow.packageId);
    if (!pkg) return null;
    
    const config = workflow.pdfConfig || {
      includeTableOfContents: true,
      includeCoverPage: true,
      includeSignaturePage: true,
      paperSize: 'letter',
      outputFormat: 'pdf-a' as const,
    };
    
    const pdf = await simulatePDFGeneration(pkg, config);
    pdf.generatedBy = generatedBy;
    
    set(state => ({
      workflows: state.workflows.map(w =>
        w.id === workflowId
          ? { ...w, generatedPDF: pdf, updatedAt: timestamp(), lastModifiedBy: generatedBy }
          : w
      ),
    }));
    
    return pdf;
  },
  
  generateCoverLetter: async (workflowId, coverLetterText) => {
    const workflow = get().getWorkflow(workflowId);
    if (!workflow) return null;
    
    const pdf = await generateCoverLetterPDF(workflow, coverLetterText);
    
    set(state => ({
      workflows: state.workflows.map(w =>
        w.id === workflowId
          ? { ...w, coverLetterPDF: pdf, coverLetterGenerated: true, updatedAt: timestamp() }
          : w
      ),
    }));
    
    return pdf;
  },
  
  linkToSequence: (workflowId, sequenceId) => {
    set(state => ({
      workflows: state.workflows.map(w =>
        w.id === workflowId
          ? { ...w, targetSequenceId: sequenceId, updatedAt: timestamp() }
          : w
      ),
    }));
  },
  
  lockForSubmission: (workflowId, lockedBy) => {
    const workflow = get().getWorkflow(workflowId);
    if (!workflow) return false;
    
    // Verify all requirements met
    const { canAdvance, blockers } = get().canAdvanceToStep(workflowId, 'locked');
    if (!canAdvance) {
      console.warn('Cannot lock:', blockers);
      return false;
    }
    
    const now = timestamp();
    
    set(state => ({
      workflows: state.workflows.map(w =>
        w.id === workflowId
          ? {
              ...w,
              currentStep: 'locked',
              stepHistory: [...w.stepHistory, { step: 'locked', timestamp: now, userId: lockedBy }],
              sequenceLocked: true,
              lockedAt: now,
              updatedAt: now,
              lastModifiedBy: lockedBy,
            }
          : w
      ),
    }));
    
    // Update correspondence package status
    const corrBridge = useHAQCorrespondenceBridge.getState();
    corrBridge.updatePackageStatus(workflow.packageId, 'ready-for-submission');
    
    return true;
  },
  
  getWorkflow: (workflowId) => {
    return get().workflows.find(w => w.id === workflowId);
  },
  
  getWorkflowByPackage: (packageId) => {
    return get().workflows.find(w => w.packageId === packageId);
  },
  
  getWorkflowsForApplication: (applicationId) => {
    return get().workflows.filter(w => w.applicationId === applicationId);
  },
  
  getPendingSignatures: (workflowId) => {
    const workflow = get().getWorkflow(workflowId);
    if (!workflow) return [];
    return workflow.signatureRequirements.filter(s => s.status === 'pending' && s.required);
  },
  
  canAdvanceToStep: (workflowId, targetStep) => {
    const workflow = get().getWorkflow(workflowId);
    if (!workflow) return { canAdvance: false, blockers: ['Workflow not found'] };
    
    const blockers: string[] = [];
    
    switch (targetStep) {
      case 'content-review':
        // Can always advance from draft to content review
        break;
        
      case 'qc-checklist':
        // Content review should be done
        break;
        
      case 'signature-collection':
        // QC must be completed
        if (!workflow.qcChecklist || workflow.qcChecklist.completedAt === '') {
          blockers.push('QC checklist must be completed');
        } else if (workflow.qcChecklist.overallStatus === 'failed') {
          blockers.push('QC checklist has critical failures');
        }
        break;
        
      case 'pdf-generation':
        // All required signatures must be collected
        if (!workflow.allSignaturesCollected) {
          const pending = get().getPendingSignatures(workflowId);
          blockers.push(`${pending.length} required signature(s) pending`);
        }
        // Check for declined signatures
        const declined = workflow.signatureRequirements.filter(s => s.status === 'declined' && s.required);
        if (declined.length > 0) {
          blockers.push(`${declined.length} signature(s) declined - workflow blocked`);
        }
        break;
        
      case 'final-review':
        // PDF must be generated
        if (!workflow.generatedPDF) {
          blockers.push('Response PDF must be generated');
        }
        break;
        
      case 'locked':
        // Final review complete, all documents ready
        if (!workflow.generatedPDF) {
          blockers.push('Response PDF not generated');
        }
        if (workflow.generatedPDF && !workflow.generatedPDF.validated) {
          blockers.push('Response PDF failed validation');
        }
        if (!workflow.targetSequenceId) {
          blockers.push('Must be linked to a sequence');
        }
        break;
    }
    
    return { canAdvance: blockers.length === 0, blockers };
  },
  
  deleteWorkflow: (workflowId) => {
    set(state => ({
      workflows: state.workflows.filter(w => w.id !== workflowId),
    }));
  },
}));

// ============================================================================
// HOOKS - with stable references via useMemo
// ============================================================================

import { useMemo } from 'react';

export const useWorkflowByPackage = (packageId: string) => {
  const workflows = useDocumentFinalization(state => state.workflows);
  return useMemo(
    () => workflows.find(w => w.packageId === packageId),
    [workflows, packageId]
  );
};

export const useWorkflowsForApplication = (applicationId: string) => {
  const workflows = useDocumentFinalization(state => state.workflows);
  return useMemo(
    () => workflows.filter(w => w.applicationId === applicationId),
    [workflows, applicationId]
  );
};

export const usePendingSignatures = (workflowId: string) => {
  const workflows = useDocumentFinalization(state => state.workflows);
  return useMemo(() => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (!workflow) return [];
    return workflow.signatureRequirements.filter(s => s.status === 'pending' && s.required);
  }, [workflows, workflowId]);
};

export const useCanAdvanceStep = (workflowId: string, targetStep: FinalizationStep) => {
  const workflows = useDocumentFinalization(state => state.workflows);
  return useMemo(() => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (!workflow) return { canAdvance: false, blockers: ['Workflow not found'] };
    
    const blockers: string[] = [];
    
    switch (targetStep) {
      case 'content-review':
        break;
        
      case 'qc-checklist':
        break;
        
      case 'signature-collection':
        if (!workflow.qcChecklist || workflow.qcChecklist.completedAt === '') {
          blockers.push('QC checklist must be completed');
        } else if (workflow.qcChecklist.overallStatus === 'failed') {
          blockers.push('QC checklist has critical failures');
        }
        break;
        
      case 'pdf-generation':
        if (!workflow.allSignaturesCollected) {
          const pending = workflow.signatureRequirements.filter(s => s.status === 'pending' && s.required);
          blockers.push(`${pending.length} required signature(s) pending`);
        }
        const declined = workflow.signatureRequirements.filter(s => s.status === 'declined' && s.required);
        if (declined.length > 0) {
          blockers.push(`${declined.length} signature(s) declined - workflow blocked`);
        }
        break;
        
      case 'final-review':
        if (!workflow.generatedPDF) {
          blockers.push('Response PDF must be generated');
        }
        break;
        
      case 'locked':
        if (!workflow.generatedPDF) {
          blockers.push('Response PDF not generated');
        }
        if (workflow.generatedPDF && !workflow.generatedPDF.validated) {
          blockers.push('Response PDF failed validation');
        }
        if (!workflow.targetSequenceId) {
          blockers.push('Must be linked to a sequence');
        }
        break;
    }
    
    return { canAdvance: blockers.length === 0, blockers };
  }, [workflows, workflowId, targetStep]);
};
