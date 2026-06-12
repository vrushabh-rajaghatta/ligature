


import { create } from 'zustand';
import { useMemo } from 'react';
import {
  useDocumentFinalization,
  FinalizationWorkflow,
  GeneratedPDF,
} from './useDocumentFinalization';
import {
  useHAQCorrespondenceBridge,
  CorrespondencePackage,
} from './useHAQCorrespondenceBridge';
import {
  useSequenceBuilderStore,
  SequenceDraft,
  DocumentSlot,
} from './useSequenceBuilderStore';
import { usePortfolioStore } from '@/stores/portfolio-store';

// ============================================================================
// TYPES
// ============================================================================

export type PublishingPhase = 
  | 'finalization'     // Document QC, signatures, PDF generation
  | 'sequence-build'   // Assign documents to sequence slots
  | 'validation'       // Run eCTD validation
  | 'gateway-submit'   // Submit to regulatory gateway
  | 'acknowledgment'   // Await gateway acknowledgment
  | 'complete'         // End state
  | 'qa-review'         // QA review phase
  | 'submitted';        // Submitted to agency

export type PublishingStatus = 
  | 'pending'
  | 'in-progress'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'not-started';

export interface PublishingMilestone {
  phase: PublishingPhase;
  status: PublishingStatus;
  startedAt?: string;
  completedAt?: string;
  blockedReason?: string;
  failureReason?: string;
}

export interface SequenceDocumentAssignment {
  slotId: string;
  sectionNumber: string;
  sectionTitle: string;
  source: 'finalization' | 'authoring' | 'upload' | 'reference';
  sourceId: string;        // finalizationWorkflowId, authoringDocId, or upload ref
  documentTitle: string;
  pdfPath?: string;
  assigned: boolean;
  validated: boolean;
}

export interface GatewaySubmissionRecord {
  id: string;
  gateway: 'fda-esg' | 'ema-cesp' | 'pmda-gateway' | 'hc-cta';
  submittedAt: string;
  trackingNumber?: string;
  status: 'pending' | 'submitted' | 'acknowledged' | 'accepted' | 'rejected';
  acknowledgedAt?: string;
  acknowledgmentId?: string;
  rejectionReason?: string;
  retryCount: number;
}

export interface EndToEndWorkflow {
  id: string;
  
  // Source references
  finalizationWorkflowId: string;
  correspondencePackageId: string;
  applicationId: string;
  applicationNumber: string;
  
  // Sequence info
  sequenceDraftId?: string;
  sequenceNumber?: string;
  sequenceType: 'ir-response' | 'amendment' | 'supplement';
  
  // Phase tracking
  currentPhase: PublishingPhase;
  milestones: PublishingMilestone[];
  
  // Document assignments for sequence
  documentAssignments: SequenceDocumentAssignment[];
  
  // Generated artifacts
  responsePDF?: GeneratedPDF;
  coverLetterPDF?: GeneratedPDF;
  
  // Submission
  gatewaySubmission?: GatewaySubmissionRecord;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  
  // Metadata
  createdBy: string;
  region: 'fda' | 'ema' | 'pmda' | 'nmpa' | 'hc';
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const generateId = (prefix: string): string => 
  `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const timestamp = (): string => new Date().toISOString();

const createInitialMilestones = (): PublishingMilestone[] => [
  { phase: 'finalization', status: 'pending' },
  { phase: 'sequence-build', status: 'pending' },
  { phase: 'validation', status: 'pending' },
  { phase: 'gateway-submit', status: 'pending' },
  { phase: 'acknowledgment', status: 'pending' },
  { phase: 'complete', status: 'pending' },
];

// ============================================================================
// STORE
// ============================================================================

interface EndToEndPublishingState {
  // Active workflows
  workflows: EndToEndWorkflow[];
  
  // Create workflow from a locked finalization
  createFromFinalization: (finalizationWorkflowId: string, createdBy: string) => string | null;
  
  // Phase transitions
  startPhase: (workflowId: string, phase: PublishingPhase) => boolean;
  completePhase: (workflowId: string, phase: PublishingPhase) => boolean;
  failPhase: (workflowId: string, phase: PublishingPhase, reason: string) => void;
  blockPhase: (workflowId: string, phase: PublishingPhase, reason: string) => void;
  
  // Sequence operations
  createSequenceDraft: (workflowId: string) => string | null;
  assignDocumentToSlot: (workflowId: string, slotId: string, sourceId: string, source: SequenceDocumentAssignment['source']) => void;
  autoAssignDocuments: (workflowId: string) => number;
  
  // Validation
  runSequenceValidation: (workflowId: string) => Promise<{ passed: boolean; errors: number; warnings: number }>;
  
  // Gateway submission
  submitToGateway: (workflowId: string, gateway: GatewaySubmissionRecord['gateway']) => Promise<GatewaySubmissionRecord>;
  recordAcknowledgment: (workflowId: string, acknowledgmentId: string) => void;
  
  // Full orchestration
  orchestrateFullWorkflow: (workflowId: string) => Promise<{ success: boolean; finalPhase: PublishingPhase; error?: string }>;
  
  // Queries
  getWorkflow: (workflowId: string) => EndToEndWorkflow | undefined;
  getWorkflowByFinalization: (finalizationWorkflowId: string) => EndToEndWorkflow | undefined;
  getWorkflowsForApplication: (applicationId: string) => EndToEndWorkflow[];
  getCurrentPhaseStatus: (workflowId: string) => { phase: PublishingPhase; status: PublishingStatus; blockers: string[] };
  getProgressPercentage: (workflowId: string) => number;
  
  // Cleanup
  deleteWorkflow: (workflowId: string) => void;
}

export const useEndToEndPublishing = create<EndToEndPublishingState>()((set, get) => ({
  workflows: [],
  
  createFromFinalization: (finalizationWorkflowId, createdBy) => {
    const finStore = useDocumentFinalization.getState();
    const finWorkflow = finStore.getWorkflow(finalizationWorkflowId);
    
    if (!finWorkflow || finWorkflow.currentStep !== 'locked') {
      console.warn('Finalization workflow must be locked to create E2E workflow');
      return null;
    }
    
    // Get correspondence package for additional context
    const corrBridge = useHAQCorrespondenceBridge.getState();
    const pkg = corrBridge.getPackageById(finWorkflow.packageId);
    
    if (!pkg) return null;
    
    const workflowId = generateId('e2e');
    const now = timestamp();
    
    // Create default document assignments for IR response
    const documentAssignments: SequenceDocumentAssignment[] = [
      {
        slotId: 's-1.2',
        sectionNumber: '1.2',
        sectionTitle: 'Cover Letter',
        source: 'finalization',
        sourceId: finalizationWorkflowId,
        documentTitle: 'Cover Letter',
        assigned: !!finWorkflow.coverLetterPDF,
        validated: false,
      },
      {
        slotId: 's-1.12.1',
        sectionNumber: '1.12.1',
        sectionTitle: 'Response to Questions',
        source: 'finalization',
        sourceId: finalizationWorkflowId,
        documentTitle: pkg.title,
        pdfPath: finWorkflow.generatedPDF?.filePath,
        assigned: !!finWorkflow.generatedPDF,
        validated: false,
      },
    ];
    
    const workflow: EndToEndWorkflow = {
      id: workflowId,
      finalizationWorkflowId,
      correspondencePackageId: finWorkflow.packageId,
      applicationId: finWorkflow.applicationId,
      applicationNumber: finWorkflow.applicationNumber,
      
      sequenceType: 'ir-response',
      
      currentPhase: 'finalization',
      milestones: createInitialMilestones(),
      
      documentAssignments,
      responsePDF: finWorkflow.generatedPDF,
      coverLetterPDF: finWorkflow.coverLetterPDF,
      
      createdAt: now,
      updatedAt: now,
      createdBy,
      region: 'fda', // Default to FDA for IR responses
    };
    
    // Mark finalization as complete since it's already locked
    workflow.milestones[0] = {
      phase: 'finalization',
      status: 'completed',
      startedAt: finWorkflow.stepHistory[0]?.timestamp,
      completedAt: finWorkflow.lockedAt,
    };
    workflow.currentPhase = 'sequence-build';
    
    set(state => ({
      workflows: [...state.workflows, workflow],
    }));
    
    return workflowId;
  },
  
  startPhase: (workflowId, phase) => {
    const workflow = get().getWorkflow(workflowId);
    if (!workflow) return false;
    
    const now = timestamp();
    
    set(state => ({
      workflows: state.workflows.map(w => {
        if (w.id !== workflowId) return w;
        
        const milestones = w.milestones.map(m =>
          m.phase === phase
            ? { ...m, status: 'in-progress' as PublishingStatus, startedAt: now }
            : m
        );
        
        return { ...w, currentPhase: phase, milestones, updatedAt: now };
      }),
    }));
    
    return true;
  },
  
  completePhase: (workflowId, phase) => {
    const workflow = get().getWorkflow(workflowId);
    if (!workflow) return false;
    
    const now = timestamp();
    const phaseOrder: PublishingPhase[] = ['finalization', 'sequence-build', 'validation', 'gateway-submit', 'acknowledgment', 'complete'];
    const currentIndex = phaseOrder.indexOf(phase);
    const nextPhase = phaseOrder[currentIndex + 1] || 'complete';
    
    set(state => ({
      workflows: state.workflows.map(w => {
        if (w.id !== workflowId) return w;
        
        const milestones = w.milestones.map(m =>
          m.phase === phase
            ? { ...m, status: 'completed' as PublishingStatus, completedAt: now }
            : m
        );
        
        return {
          ...w,
          currentPhase: nextPhase,
          milestones,
          updatedAt: now,
          completedAt: nextPhase === 'complete' ? now : undefined,
        };
      }),
    }));
    
    return true;
  },
  
  failPhase: (workflowId, phase, reason) => {
    const now = timestamp();
    
    set(state => ({
      workflows: state.workflows.map(w => {
        if (w.id !== workflowId) return w;
        
        const milestones = w.milestones.map(m =>
          m.phase === phase
            ? { ...m, status: 'failed' as PublishingStatus, failureReason: reason }
            : m
        );
        
        return { ...w, milestones, updatedAt: now };
      }),
    }));
  },
  
  blockPhase: (workflowId, phase, reason) => {
    const now = timestamp();
    
    set(state => ({
      workflows: state.workflows.map(w => {
        if (w.id !== workflowId) return w;
        
        const milestones = w.milestones.map(m =>
          m.phase === phase
            ? { ...m, status: 'blocked' as PublishingStatus, blockedReason: reason }
            : m
        );
        
        return { ...w, milestones, updatedAt: now };
      }),
    }));
  },
  
  createSequenceDraft: (workflowId) => {
    const workflow = get().getWorkflow(workflowId);
    if (!workflow || workflow.sequenceDraftId) return null;
    
    const subStore = useSequenceBuilderStore.getState();
    const portfolioStore = usePortfolioStore.getState();
    
    // Get next sequence number
    const sequenceNumber = portfolioStore.getNextSequenceNumber(workflow.applicationId);
    
    // Create the draft
    const draftId = subStore.createDraft({
      applicationId: workflow.applicationId,
      sequenceNumber,
      sequenceType: workflow.sequenceType,
      description: `IR Response - ${workflow.applicationNumber}`,
      region: workflow.region,
      createdBy: workflow.createdBy,
    });
    
    set(state => ({
      workflows: state.workflows.map(w =>
        w.id === workflowId
          ? { ...w, sequenceDraftId: draftId, sequenceNumber, updatedAt: timestamp() }
          : w
      ),
    }));
    
    return draftId;
  },
  
  assignDocumentToSlot: (workflowId, slotId, sourceId, source) => {
    const now = timestamp();
    
    set(state => ({
      workflows: state.workflows.map(w => {
        if (w.id !== workflowId) return w;
        
        const documentAssignments = w.documentAssignments.map(a =>
          a.slotId === slotId
            ? { ...a, sourceId, source, assigned: true }
            : a
        );
        
        return { ...w, documentAssignments, updatedAt: now };
      }),
    }));
    
    // Also assign in submissions store
    const workflow = get().getWorkflow(workflowId);
    if (workflow?.sequenceDraftId) {
      const subStore = useSequenceBuilderStore.getState();
      const assignment = workflow.documentAssignments.find(a => a.slotId === slotId);
      if (assignment) {
        subStore.assignDocument(slotId, {
          id: sourceId,
          title: assignment.documentTitle,
          sourceType: source === 'finalization' ? 'authoring' : source,
          sourceId,
          filePath: assignment.pdfPath,
        });
      }
    }
  },
  
  autoAssignDocuments: (workflowId) => {
    const workflow = get().getWorkflow(workflowId);
    if (!workflow) return 0;
    
    let assigned = 0;
    const subStore = useSequenceBuilderStore.getState();
    
    for (const assignment of workflow.documentAssignments) {
      if (assignment.assigned && assignment.pdfPath && workflow.sequenceDraftId) {
        subStore.assignDocument(assignment.slotId, {
          id: assignment.sourceId,
          title: assignment.documentTitle,
          sourceType: 'authoring',
          sourceId: assignment.sourceId,
          filePath: assignment.pdfPath,
        });
        subStore.setSlotOperation(assignment.slotId, 'new');
        assigned++;
      }
    }
    
    // Update validation status
    set(state => ({
      workflows: state.workflows.map(w => {
        if (w.id !== workflowId) return w;
        
        const documentAssignments = w.documentAssignments.map(a => ({
          ...a,
          validated: a.assigned,
        }));
        
        return { ...w, documentAssignments, updatedAt: timestamp() };
      }),
    }));
    
    return assigned;
  },
  
  runSequenceValidation: async (workflowId) => {
    const workflow = get().getWorkflow(workflowId);
    if (!workflow || !workflow.sequenceDraftId) {
      return { passed: false, errors: 1, warnings: 0 };
    }
    
    get().startPhase(workflowId, 'validation');
    
    const subStore = useSequenceBuilderStore.getState();
    subStore.setCurrentDraft(workflow.sequenceDraftId);
    
    // Run validation
    await subStore.startValidation();
    
    const summary = subStore.getValidationSummary();
    const passed = summary ? summary.errors === 0 : false;
    
    if (passed) {
      get().completePhase(workflowId, 'validation');
    } else {
      get().failPhase(workflowId, 'validation', `${summary?.errors || 0} validation errors`);
    }
    
    return {
      passed,
      errors: summary?.errors || 0,
      warnings: summary?.warnings || 0,
    };
  },
  
  submitToGateway: async (workflowId, gateway) => {
    const workflow = get().getWorkflow(workflowId);
    if (!workflow || !workflow.sequenceDraftId) {
      throw new Error('No sequence draft to submit');
    }
    
    get().startPhase(workflowId, 'gateway-submit');
    
    const subStore = useSequenceBuilderStore.getState();
    const result = await subStore.submitToGateway(gateway);
    
    const submission: GatewaySubmissionRecord = {
      id: generateId('sub'),
      gateway,
      submittedAt: timestamp(),
      trackingNumber: result.trackingNumber,
      status: result.success ? 'submitted' : 'pending',
      retryCount: 0,
    };
    
    set(state => ({
      workflows: state.workflows.map(w =>
        w.id === workflowId
          ? { ...w, gatewaySubmission: submission, updatedAt: timestamp() }
          : w
      ),
    }));
    
    if (result.success) {
      get().completePhase(workflowId, 'gateway-submit');
      get().startPhase(workflowId, 'acknowledgment');
    } else {
      get().failPhase(workflowId, 'gateway-submit', result.error || 'Gateway submission failed');
    }
    
    return submission;
  },
  
  recordAcknowledgment: (workflowId, acknowledgmentId) => {
    const now = timestamp();
    
    set(state => ({
      workflows: state.workflows.map(w => {
        if (w.id !== workflowId || !w.gatewaySubmission) return w;
        
        return {
          ...w,
          gatewaySubmission: {
            ...w.gatewaySubmission,
            status: 'acknowledged',
            acknowledgedAt: now,
            acknowledgmentId,
          },
          updatedAt: now,
        };
      }),
    }));
    
    get().completePhase(workflowId, 'acknowledgment');
    get().completePhase(workflowId, 'complete');
  },
  
  orchestrateFullWorkflow: async (workflowId) => {
    const workflow = get().getWorkflow(workflowId);
    if (!workflow) {
      return { success: false, finalPhase: 'finalization', error: 'Workflow not found' };
    }
    
    try {
      // Phase 1: Finalization should already be complete
      if (workflow.currentPhase === 'finalization') {
        return { success: false, finalPhase: 'finalization', error: 'Finalization not complete' };
      }
      
      // Phase 2: Sequence Build
      if (workflow.currentPhase === 'sequence-build') {
        get().startPhase(workflowId, 'sequence-build');
        
        // Create sequence draft if needed
        if (!workflow.sequenceDraftId) {
          const draftId = get().createSequenceDraft(workflowId);
          if (!draftId) {
            get().failPhase(workflowId, 'sequence-build', 'Failed to create sequence draft');
            return { success: false, finalPhase: 'sequence-build', error: 'Failed to create sequence draft' };
          }
        }
        
        // Auto-assign documents
        const assigned = get().autoAssignDocuments(workflowId);
        if (assigned === 0) {
          get().blockPhase(workflowId, 'sequence-build', 'No documents to assign');
          return { success: false, finalPhase: 'sequence-build', error: 'No documents to assign' };
        }
        
        get().completePhase(workflowId, 'sequence-build');
      }
      
      // Phase 3: Validation
      const updatedWorkflow1 = get().getWorkflow(workflowId);
      if (updatedWorkflow1?.currentPhase === 'validation') {
        const validationResult = await get().runSequenceValidation(workflowId);
        if (!validationResult.passed) {
          return { success: false, finalPhase: 'validation', error: `Validation failed: ${validationResult.errors} errors` };
        }
      }
      
      // Phase 4: Gateway Submit
      const updatedWorkflow2 = get().getWorkflow(workflowId);
      if (updatedWorkflow2?.currentPhase === 'gateway-submit') {
        const gatewayMap: Record<string, GatewaySubmissionRecord['gateway']> = {
          'fda': 'fda-esg',
          'ema': 'ema-cesp',
          'pmda': 'pmda-gateway',
          'hc': 'hc-cta',
        };
        const gateway = gatewayMap[workflow.region] || 'fda-esg';
        
        const submission = await get().submitToGateway(workflowId, gateway);
        if (submission.status !== 'submitted') {
          return { success: false, finalPhase: 'gateway-submit', error: 'Gateway submission failed' };
        }
      }
      
      // Phase 5: Acknowledgment - this is async, we don't wait
      const updatedWorkflow3 = get().getWorkflow(workflowId);
      if (updatedWorkflow3?.currentPhase === 'acknowledgment') {
        // In real system, this would be triggered by gateway callback
        // For demo, we simulate acknowledgment
        await new Promise(resolve => setTimeout(resolve, 1000));
        get().recordAcknowledgment(workflowId, `ACK-${Date.now()}`);
      }
      
      const finalWorkflow = get().getWorkflow(workflowId);
      return {
        success: finalWorkflow?.currentPhase === 'complete',
        finalPhase: finalWorkflow?.currentPhase || 'finalization',
      };
      
    } catch (error) {
      const currentWorkflow = get().getWorkflow(workflowId);
      return {
        success: false,
        finalPhase: currentWorkflow?.currentPhase || 'finalization',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
  
  getWorkflow: (workflowId) => {
    return get().workflows.find(w => w.id === workflowId);
  },
  
  getWorkflowByFinalization: (finalizationWorkflowId) => {
    return get().workflows.find(w => w.finalizationWorkflowId === finalizationWorkflowId);
  },
  
  getWorkflowsForApplication: (applicationId) => {
    return get().workflows.filter(w => w.applicationId === applicationId);
  },
  
  getCurrentPhaseStatus: (workflowId) => {
    const workflow = get().getWorkflow(workflowId);
    if (!workflow) {
      return { phase: 'finalization', status: 'pending', blockers: ['Workflow not found'] };
    }
    
    const currentMilestone = workflow.milestones.find(m => m.phase === workflow.currentPhase);
    const blockers: string[] = [];
    
    // Determine blockers based on phase
    switch (workflow.currentPhase) {
      case 'sequence-build':
        if (!workflow.sequenceDraftId) blockers.push('Sequence draft not created');
        if (!workflow.responsePDF) blockers.push('Response PDF not available');
        break;
      case 'validation':
        if (!workflow.documentAssignments.every(a => a.assigned)) {
          blockers.push('Not all documents assigned');
        }
        break;
      case 'gateway-submit':
        // Check validation passed
        const valMilestone = workflow.milestones.find(m => m.phase === 'validation');
        if (valMilestone?.status !== 'completed') blockers.push('Validation not complete');
        break;
      case 'acknowledgment':
        if (!workflow.gatewaySubmission?.trackingNumber) blockers.push('No tracking number');
        break;
    }
    
    if (currentMilestone?.blockedReason) {
      blockers.push(currentMilestone.blockedReason);
    }
    
    return {
      phase: workflow.currentPhase,
      status: currentMilestone?.status || 'pending',
      blockers,
    };
  },
  
  getProgressPercentage: (workflowId) => {
    const workflow = get().getWorkflow(workflowId);
    if (!workflow) return 0;
    
    const completedPhases = workflow.milestones.filter(m => m.status === 'completed').length;
    return Math.round((completedPhases / workflow.milestones.length) * 100);
  },
  
  deleteWorkflow: (workflowId) => {
    set(state => ({
      workflows: state.workflows.filter(w => w.id !== workflowId),
    }));
  },
}));

// ============================================================================
// HOOKS
// ============================================================================

export const useE2EWorkflowByFinalization = (finalizationWorkflowId: string) => {
  return useEndToEndPublishing(state => state.getWorkflowByFinalization(finalizationWorkflowId));
};

export const useE2EWorkflowsForApplication = (applicationId: string) => {
  const workflows = useEndToEndPublishing(state => state.workflows);
  return useMemo(
    () => workflows.filter(w => w.applicationId === applicationId),
    [workflows, applicationId]
  );
};

export const useE2EWorkflowProgress = (workflowId: string) => {
  const workflows = useEndToEndPublishing(state => state.workflows);
  
  return useMemo(() => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (!workflow) {
      return {
        progress: 0,
        status: { phase: 'finalization' as const, status: 'pending' as const, blockers: ['Workflow not found'] }
      };
    }
    
    // Calculate progress
    const completedPhases = workflow.milestones.filter(m => m.status === 'completed').length;
    const progress = Math.round((completedPhases / workflow.milestones.length) * 100);
    
    // Calculate status
    const currentMilestone = workflow.milestones.find(m => m.phase === workflow.currentPhase);
    const blockers: string[] = [];
    
    switch (workflow.currentPhase) {
      case 'sequence-build':
        if (!workflow.sequenceDraftId) blockers.push('Sequence draft not created');
        if (!workflow.responsePDF) blockers.push('Response PDF not available');
        break;
      case 'validation':
        if (!workflow.documentAssignments.every(a => a.assigned)) {
          blockers.push('Not all documents assigned');
        }
        break;
      case 'gateway-submit':
        const valMilestone = workflow.milestones.find(m => m.phase === 'validation');
        if (valMilestone?.status !== 'completed') blockers.push('Validation not complete');
        break;
      case 'acknowledgment':
        if (!workflow.gatewaySubmission?.trackingNumber) blockers.push('No tracking number');
        break;
    }
    
    if (currentMilestone?.blockedReason) {
      blockers.push(currentMilestone.blockedReason);
    }
    
    return {
      progress,
      status: {
        phase: workflow.currentPhase,
        status: currentMilestone?.status || 'pending' as const,
        blockers,
      }
    };
  }, [workflows, workflowId]);
};
