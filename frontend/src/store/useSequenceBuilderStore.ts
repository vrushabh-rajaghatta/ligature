

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useMemo } from 'react';
import { ECTDApplication, ECTDSequence, ECTDDocument } from '@/types/ectd';
import { useCrossModuleStore } from './useCrossModuleStore';

// ============================================================================
// SUBMISSION TYPES
// ============================================================================

export type SubmissionStatus = 
  | 'draft'
  | 'in-progress'
  | 'validating'
  | 'validated'
  | 'ready-to-submit'
  | 'submitting'
  | 'submitted'
  | 'acknowledged'
  | 'under-review'
  | 'approved'
  | 'rejected';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationResult {
  id: string;
  severity: ValidationSeverity;
  code: string;
  message: string;
  location?: string;
  documentId?: string;
  autoFixable?: boolean;
  fixed?: boolean;
}

export interface DocumentSlot {
  id: string;
  sectionId: string;
  sectionNumber: string;
  sectionTitle: string;
  moduleNumber: string;
  required: boolean;
  assignedDocument?: {
    id: string;
    title: string;
    sourceType: 'authoring' | 'upload' | 'reference';
    sourceId?: string;
    filePath?: string;
  };
  operation: 'new' | 'replace' | 'append' | 'delete' | 'none';
  validationStatus: 'pending' | 'valid' | 'invalid';
  validationMessages?: ValidationResult[];
}

export interface SequenceDraft {
  id: string;
  applicationId: string;
  sequenceNumber: string;
  sequenceType: 'original' | 'amendment' | 'supplement' | 'ir-response' | 'annual-report';
  description: string;
  status: SubmissionStatus;
  region: 'fda' | 'ema' | 'pmda' | 'nmpa' | 'hc';
  
  // Document assignments
  documentSlots: DocumentSlot[];
  
  // Validation
  validationRun?: {
    startedAt: Date;
    completedAt?: Date;
    results: ValidationResult[];
    summary: {
      errors: number;
      warnings: number;
      info: number;
    };
  };
  
  // Submission tracking
  submissionAttempts: {
    attemptedAt: Date;
    gateway: string;
    status: 'pending' | 'success' | 'failed';
    trackingNumber?: string;
    errorMessage?: string;
  }[];
  
  // Metadata
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  targetDate?: string;
}

export interface GatewayStatus {
  gateway: 'fda-esg' | 'ema-cesp' | 'pmda-gateway' | 'hc-cta';
  status: 'online' | 'degraded' | 'offline' | 'maintenance';
  lastChecked: Date;
  message?: string;
}

// ============================================================================
// SUBMISSIONS STORE
// ============================================================================

interface SubmissionsState {
  // Current work
  currentDraft: SequenceDraft | null;
  
  // All drafts
  drafts: SequenceDraft[];
  
  // Gateway statuses
  gatewayStatuses: GatewayStatus[];
  
  // UI State
  isValidating: boolean;
  isSubmitting: boolean;
  selectedSlotId: string | null;
  
  // Draft Management
  createDraft: (params: {
    applicationId: string;
    sequenceNumber: string;
    sequenceType: SequenceDraft['sequenceType'];
    description: string;
    region: SequenceDraft['region'];
    createdBy: string;
  }) => string;
  
  setCurrentDraft: (draftId: string | null) => void;
  updateDraft: (draftId: string, updates: Partial<SequenceDraft>) => void;
  deleteDraft: (draftId: string) => void;
  
  // Document Assignment
  assignDocument: (slotId: string, document: DocumentSlot['assignedDocument']) => void;
  removeDocument: (slotId: string) => void;
  setSlotOperation: (slotId: string, operation: DocumentSlot['operation']) => void;
  
  // Validation
  startValidation: () => Promise<void>;
  clearValidation: () => void;
  fixValidationIssue: (issueId: string) => void;
  
  // Submission
  submitToGateway: (gateway: string) => Promise<{ success: boolean; trackingNumber?: string; error?: string }>;
  
  // Gateway
  checkGatewayStatus: (gateway: GatewayStatus['gateway']) => Promise<void>;
  
  // Queries
  getDraftById: (draftId: string) => SequenceDraft | undefined;
  getDraftsForApplication: (applicationId: string) => SequenceDraft[];
  getValidationSummary: () => { errors: number; warnings: number; info: number } | null;
  canSubmit: () => boolean;
  
  // Selection
  selectSlot: (slotId: string | null) => void;
}

const generateId = () => `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Generate default document slots for a sequence
function generateDefaultSlots(region: SequenceDraft['region'], sequenceType: SequenceDraft['sequenceType']): DocumentSlot[] {
  const slots: DocumentSlot[] = [];
  
  // Module 1 - Regional Administrative
  slots.push(
    { id: 's-1.1', sectionId: '1.1', sectionNumber: '1.1', sectionTitle: 'Forms', moduleNumber: '1', required: true, operation: 'none', validationStatus: 'pending' },
    { id: 's-1.2', sectionId: '1.2', sectionNumber: '1.2', sectionTitle: 'Cover Letter', moduleNumber: '1', required: true, operation: 'none', validationStatus: 'pending' },
    { id: 's-1.3', sectionId: '1.3', sectionNumber: '1.3', sectionTitle: 'Administrative Information', moduleNumber: '1', required: false, operation: 'none', validationStatus: 'pending' },
  );
  
  if (region === 'fda') {
    slots.push(
      { id: 's-1.4', sectionId: '1.4', sectionNumber: '1.4', sectionTitle: 'Labeling', moduleNumber: '1', required: sequenceType === 'original', operation: 'none', validationStatus: 'pending' },
      { id: 's-1.5', sectionId: '1.5', sectionNumber: '1.5', sectionTitle: 'Reviewer Guide', moduleNumber: '1', required: false, operation: 'none', validationStatus: 'pending' },
    );
  }
  
  // Module 2 - Summaries
  if (sequenceType === 'original' || sequenceType === 'supplement') {
    slots.push(
      { id: 's-2.2', sectionId: '2.2', sectionNumber: '2.2', sectionTitle: 'Introduction', moduleNumber: '2', required: true, operation: 'none', validationStatus: 'pending' },
      { id: 's-2.3', sectionId: '2.3', sectionNumber: '2.3', sectionTitle: 'Quality Overall Summary', moduleNumber: '2', required: true, operation: 'none', validationStatus: 'pending' },
      { id: 's-2.4', sectionId: '2.4', sectionNumber: '2.4', sectionTitle: 'Nonclinical Overview', moduleNumber: '2', required: true, operation: 'none', validationStatus: 'pending' },
      { id: 's-2.5', sectionId: '2.5', sectionNumber: '2.5', sectionTitle: 'Clinical Overview', moduleNumber: '2', required: true, operation: 'none', validationStatus: 'pending' },
      { id: 's-2.6', sectionId: '2.6', sectionNumber: '2.6', sectionTitle: 'Nonclinical Summary', moduleNumber: '2', required: true, operation: 'none', validationStatus: 'pending' },
      { id: 's-2.7', sectionId: '2.7', sectionNumber: '2.7', sectionTitle: 'Clinical Summary', moduleNumber: '2', required: true, operation: 'none', validationStatus: 'pending' },
    );
  }
  
  // Module 3 - Quality
  if (sequenceType === 'original' || sequenceType === 'supplement') {
    slots.push(
      { id: 's-3.2.S', sectionId: '3.2.S', sectionNumber: '3.2.S', sectionTitle: 'Drug Substance', moduleNumber: '3', required: true, operation: 'none', validationStatus: 'pending' },
      { id: 's-3.2.P', sectionId: '3.2.P', sectionNumber: '3.2.P', sectionTitle: 'Drug Product', moduleNumber: '3', required: true, operation: 'none', validationStatus: 'pending' },
    );
  }
  
  // Module 4 - Nonclinical
  if (sequenceType === 'original') {
    slots.push(
      { id: 's-4.2.1', sectionId: '4.2.1', sectionNumber: '4.2.1', sectionTitle: 'Pharmacology', moduleNumber: '4', required: true, operation: 'none', validationStatus: 'pending' },
      { id: 's-4.2.2', sectionId: '4.2.2', sectionNumber: '4.2.2', sectionTitle: 'Pharmacokinetics', moduleNumber: '4', required: true, operation: 'none', validationStatus: 'pending' },
      { id: 's-4.2.3', sectionId: '4.2.3', sectionNumber: '4.2.3', sectionTitle: 'Toxicology', moduleNumber: '4', required: true, operation: 'none', validationStatus: 'pending' },
    );
  }
  
  // Module 5 - Clinical
  if (sequenceType === 'original' || sequenceType === 'supplement') {
    slots.push(
      { id: 's-5.3.1', sectionId: '5.3.1', sectionNumber: '5.3.1', sectionTitle: 'Biopharmaceutic Studies', moduleNumber: '5', required: false, operation: 'none', validationStatus: 'pending' },
      { id: 's-5.3.3', sectionId: '5.3.3', sectionNumber: '5.3.3', sectionTitle: 'PK/PD Studies', moduleNumber: '5', required: false, operation: 'none', validationStatus: 'pending' },
      { id: 's-5.3.5', sectionId: '5.3.5', sectionNumber: '5.3.5', sectionTitle: 'Efficacy Studies', moduleNumber: '5', required: true, operation: 'none', validationStatus: 'pending' },
      { id: 's-5.3.6', sectionId: '5.3.6', sectionNumber: '5.3.6', sectionTitle: 'Safety Data', moduleNumber: '5', required: true, operation: 'none', validationStatus: 'pending' },
    );
  }
  
  // IR Response specific - Module 1.12 Correspondence
  if (sequenceType === 'ir-response') {
    slots.push(
      { id: 's-1.12', sectionId: '1.12', sectionNumber: '1.12', sectionTitle: 'Correspondence', moduleNumber: '1', required: true, operation: 'none', validationStatus: 'pending' },
      { id: 's-1.12.1', sectionId: '1.12.1', sectionNumber: '1.12.1', sectionTitle: 'Response to Questions', moduleNumber: '1', required: true, operation: 'none', validationStatus: 'pending' },
      { id: 's-1.12.2', sectionId: '1.12.2', sectionNumber: '1.12.2', sectionTitle: 'Supporting Documents', moduleNumber: '1', required: false, operation: 'none', validationStatus: 'pending' },
    );
  }
  
  return slots;
}

// Mock validation logic
async function runValidation(draft: SequenceDraft): Promise<ValidationResult[]> {
  // Simulate validation delay
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
  
  const results: ValidationResult[] = [];
  
  // Check required documents
  for (const slot of draft.documentSlots) {
    if (slot.required && !slot.assignedDocument) {
      results.push({
        id: `val-${slot.id}-missing`,
        severity: 'error',
        code: 'DOC-001',
        message: `Required document missing: ${slot.sectionTitle}`,
        location: `Module ${slot.moduleNumber}, Section ${slot.sectionNumber}`,
      });
    }
  }
  
  // Check cover letter
  const coverLetter = draft.documentSlots.find(s => s.sectionNumber === '1.2');
  if (coverLetter?.assignedDocument) {
    results.push({
      id: 'val-cover-ok',
      severity: 'info',
      code: 'DOC-100',
      message: 'Cover letter present and formatted correctly',
      location: 'Module 1, Section 1.2',
    });
  }
  
  // Simulate some warnings
  if (draft.sequenceType === 'original') {
    const qos = draft.documentSlots.find(s => s.sectionNumber === '2.3');
    if (qos?.assignedDocument) {
      results.push({
        id: 'val-qos-bookmarks',
        severity: 'warning',
        code: 'PDF-012',
        message: 'Quality Overall Summary may be missing PDF bookmarks',
        location: 'Module 2, Section 2.3',
        documentId: qos.id,
        autoFixable: true,
      });
    }
  }
  
  // Check for forms
  const forms = draft.documentSlots.find(s => s.sectionNumber === '1.1');
  if (!forms?.assignedDocument && draft.region === 'fda') {
    results.push({
      id: 'val-356h-missing',
      severity: 'error',
      code: 'FDA-001',
      message: 'Form FDA 356h is required for FDA submissions',
      location: 'Module 1, Section 1.1',
    });
  }
  
  // Add general check
  results.push({
    id: 'val-xml-structure',
    severity: 'info',
    code: 'XML-001',
    message: 'XML backbone structure validated successfully',
  });
  
  // Checksum validation
  const assignedDocs = draft.documentSlots.filter(s => s.assignedDocument);
  if (assignedDocs.length > 0) {
    results.push({
      id: 'val-checksum',
      severity: 'info',
      code: 'CHK-001',
      message: `${assignedDocs.length} document checksums verified`,
    });
  }
  
  return results;
}

export const useSequenceBuilderStore = create<SubmissionsState>()(
  devtools(
    (set, get) => ({
      currentDraft: null,
      drafts: [],
      gatewayStatuses: [
        { gateway: 'fda-esg', status: 'online', lastChecked: new Date() },
        { gateway: 'ema-cesp', status: 'online', lastChecked: new Date() },
        { gateway: 'pmda-gateway', status: 'degraded', lastChecked: new Date(), message: 'Scheduled maintenance 2024-12-20' },
        { gateway: 'hc-cta', status: 'online', lastChecked: new Date() },
      ],
      isValidating: false,
      isSubmitting: false,
      selectedSlotId: null,
      
      createDraft: (params) => {
        const id = generateId();
        const draft: SequenceDraft = {
          id,
          applicationId: params.applicationId,
          sequenceNumber: params.sequenceNumber,
          sequenceType: params.sequenceType,
          description: params.description,
          region: params.region,
          status: 'draft',
          documentSlots: generateDefaultSlots(params.region, params.sequenceType),
          submissionAttempts: [],
          createdAt: new Date(),
          createdBy: params.createdBy,
          updatedAt: new Date(),
        };
        
        set(state => ({
          drafts: [...state.drafts, draft],
          currentDraft: draft,
        }), false, 'createDraft');
        
        // Emit cross-module event
        useCrossModuleStore.getState().emitEvent({
          eventType: 'entity-created',
          sourceModule: 'submissions',
          targetModules: ['regulatory', 'authoring', 'tmf'],
          entityType: 'sequence-draft',
          entityId: id,
          description: `Sequence ${draft.sequenceNumber} draft created (${draft.region.toUpperCase()})`,
          payload: { 
            sequenceNumber: draft.sequenceNumber, 
            sequenceType: draft.sequenceType, 
            region: draft.region,
            applicationId: draft.applicationId,
          },
        });
        
        return id;
      },
      
      setCurrentDraft: (draftId) => {
        const draft = draftId ? get().drafts.find(d => d.id === draftId) || null : null;
        set({ currentDraft: draft }, false, 'setCurrentDraft');
      },
      
      updateDraft: (draftId, updates) => {
        set(state => ({
          drafts: state.drafts.map(d => 
            d.id === draftId 
              ? { ...d, ...updates, updatedAt: new Date() }
              : d
          ),
          currentDraft: state.currentDraft?.id === draftId 
            ? { ...state.currentDraft, ...updates, updatedAt: new Date() }
            : state.currentDraft,
        }), false, 'updateDraft');
      },
      
      deleteDraft: (draftId) => {
        set(state => ({
          drafts: state.drafts.filter(d => d.id !== draftId),
          currentDraft: state.currentDraft?.id === draftId ? null : state.currentDraft,
        }), false, 'deleteDraft');
      },
      
      assignDocument: (slotId, document) => {
        const draft = get().currentDraft;
        if (!draft) return;
        
        const updatedSlots = draft.documentSlots.map(slot =>
          slot.id === slotId
            ? { ...slot, assignedDocument: document, operation: 'new' as const, validationStatus: 'pending' as const }
            : slot
        );
        
        get().updateDraft(draft.id, { 
          documentSlots: updatedSlots,
          status: 'in-progress',
        });
      },
      
      removeDocument: (slotId) => {
        const draft = get().currentDraft;
        if (!draft) return;
        
        const updatedSlots = draft.documentSlots.map(slot =>
          slot.id === slotId
            ? { ...slot, assignedDocument: undefined, operation: 'none' as const, validationStatus: 'pending' as const }
            : slot
        );
        
        get().updateDraft(draft.id, { documentSlots: updatedSlots });
      },
      
      setSlotOperation: (slotId, operation) => {
        const draft = get().currentDraft;
        if (!draft) return;
        
        const updatedSlots = draft.documentSlots.map(slot =>
          slot.id === slotId ? { ...slot, operation } : slot
        );
        
        get().updateDraft(draft.id, { documentSlots: updatedSlots });
      },
      
      startValidation: async () => {
        const draft = get().currentDraft;
        if (!draft) return;
        
        set({ isValidating: true }, false, 'startValidation');
        get().updateDraft(draft.id, { status: 'validating' });
        
        try {
          const results = await runValidation(draft);
          
          const summary = {
            errors: results.filter(r => r.severity === 'error').length,
            warnings: results.filter(r => r.severity === 'warning').length,
            info: results.filter(r => r.severity === 'info').length,
          };
          
          // Update slot validation statuses
          const updatedSlots = draft.documentSlots.map(slot => {
            const slotErrors = results.filter(r => r.location?.includes(slot.sectionNumber) && r.severity === 'error');
            return {
              ...slot,
              validationStatus: slotErrors.length > 0 ? 'invalid' as const : 'valid' as const,
              validationMessages: results.filter(r => r.location?.includes(slot.sectionNumber)),
            };
          });
          
          get().updateDraft(draft.id, {
            status: summary.errors > 0 ? 'in-progress' : 'validated',
            documentSlots: updatedSlots,
            validationRun: {
              startedAt: new Date(),
              completedAt: new Date(),
              results,
              summary,
            },
          });
        } finally {
          set({ isValidating: false }, false, 'endValidation');
        }
      },
      
      clearValidation: () => {
        const draft = get().currentDraft;
        if (!draft) return;
        
        const updatedSlots = draft.documentSlots.map(slot => ({
          ...slot,
          validationStatus: 'pending' as const,
          validationMessages: undefined,
        }));
        
        get().updateDraft(draft.id, {
          documentSlots: updatedSlots,
          validationRun: undefined,
          status: 'in-progress',
        });
      },
      
      fixValidationIssue: (issueId) => {
        const draft = get().currentDraft;
        if (!draft?.validationRun) return;
        
        const updatedResults = draft.validationRun.results.map(r =>
          r.id === issueId ? { ...r, fixed: true } : r
        );
        
        get().updateDraft(draft.id, {
          validationRun: {
            ...draft.validationRun,
            results: updatedResults,
          },
        });
      },
      
      submitToGateway: async (gateway) => {
        const draft = get().currentDraft;
        if (!draft) return { success: false, error: 'No draft selected' };
        
        set({ isSubmitting: true }, false, 'startSubmit');
        
        // Emit workflow started event
        useCrossModuleStore.getState().emitEvent({
          eventType: 'workflow-started',
          sourceModule: 'submissions',
          targetModules: ['regulatory'],
          entityType: 'submission',
          entityId: draft.id,
          description: `Submitting sequence ${draft.sequenceNumber} to ${gateway.toUpperCase()}`,
          payload: { gateway, sequenceNumber: draft.sequenceNumber, region: draft.region },
        });
        
        try {
          // Simulate submission delay
          await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
          
          // Simulate success/failure (90% success rate)
          const success = Math.random() > 0.1;
          const trackingNumber = success ? `${gateway.toUpperCase()}-${Date.now()}` : undefined;
          
          const attempt = {
            attemptedAt: new Date(),
            gateway,
            status: success ? 'success' as const : 'failed' as const,
            trackingNumber,
            errorMessage: success ? undefined : 'Gateway timeout - please retry',
          };
          
          get().updateDraft(draft.id, {
            status: success ? 'submitted' : 'ready-to-submit',
            submissionAttempts: [...draft.submissionAttempts, attempt],
          });
          
          // Emit completion event
          useCrossModuleStore.getState().emitEvent({
            eventType: success ? 'workflow-completed' : 'workflow-failed',
            sourceModule: 'submissions',
            targetModules: ['regulatory', 'tmf'],
            entityType: 'submission',
            entityId: draft.id,
            description: success 
              ? `Sequence ${draft.sequenceNumber} submitted successfully (${trackingNumber})`
              : `Sequence ${draft.sequenceNumber} submission failed`,
            payload: { 
              gateway, 
              success, 
              trackingNumber, 
              error: attempt.errorMessage,
              sequenceNumber: draft.sequenceNumber,
            },
          });
          
          return { success, trackingNumber, error: attempt.errorMessage };
        } finally {
          set({ isSubmitting: false }, false, 'endSubmit');
        }
      },
      
      checkGatewayStatus: async (gateway) => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        set(state => ({
          gatewayStatuses: state.gatewayStatuses.map(g =>
            g.gateway === gateway ? { ...g, lastChecked: new Date() } : g
          ),
        }), false, 'checkGatewayStatus');
      },
      
      getDraftById: (draftId) => get().drafts.find(d => d.id === draftId),
      
      getDraftsForApplication: (applicationId) => 
        get().drafts.filter(d => d.applicationId === applicationId),
      
      getValidationSummary: () => get().currentDraft?.validationRun?.summary || null,
      
      canSubmit: () => {
        const draft = get().currentDraft;
        if (!draft) return false;
        if (!draft.validationRun) return false;
        if (draft.validationRun.summary.errors > 0) return false;
        return true;
      },
      
      selectSlot: (slotId) => set({ selectedSlotId: slotId }, false, 'selectSlot'),
    }),
    { name: 'SubmissionsStore' }
  )
);

// ============================================================================
// HELPER HOOKS
// ============================================================================

const EMPTY_VALIDATION_RESULTS: never[] = [];

export function useCurrentDraft() {
  return useSequenceBuilderStore(state => state.currentDraft);
}

export function useValidationResults() {
  const results = useSequenceBuilderStore(state => state.currentDraft?.validationRun?.results);
  return results || EMPTY_VALIDATION_RESULTS;
}

export function useGatewayStatus(gateway: GatewayStatus['gateway']) {
  return useSequenceBuilderStore(state => state.gatewayStatuses.find(g => g.gateway === gateway));
}
