

/**
 * Submissions-Portfolio Store Bridge
 * 
 * This module provides hooks that coordinate sequence operations between
 * the SubmissionsStore (draft management, validation, gateway submission)
 * and the PortfolioStore (canonical application/sequence data).
 * 
 * The key insight is:
 * - PortfolioStore is the source of truth for application/sequence metadata
 * - SubmissionsStore manages the draft workflow (documents, validation, submission)
 * - This bridge ensures both stay in sync
 */

import { useCallback } from 'react';
import { usePortfolioStore, type SequenceType, type SequenceStatus } from '@/stores/portfolio-store';
import { useSequenceBuilderStore, SequenceDraft } from '@/store/useSequenceBuilderStore';
import { useToast } from '@/components/ui/Toast';

// Map SubmissionsStore sequence types to PortfolioStore types
const mapSequenceType = (type: SequenceDraft['sequenceType']): SequenceType => {
  const typeMap: Record<SequenceDraft['sequenceType'], SequenceType> = {
    'original': 'original',
    'amendment': 'amendment',
    'supplement': 'supplement',
    'ir-response': 'ir-response',
    'annual-report': 'annual-report',
  };
  return typeMap[type] || 'amendment';
};

// Map SubmissionsStore status to PortfolioStore status
const mapDraftStatus = (status: SequenceDraft['status']): SequenceStatus => {
  const statusMap: Record<SequenceDraft['status'], SequenceStatus> = {
    'draft': 'draft',
    'in-progress': 'draft',
    'validating': 'in-qc',
    'validated': 'qc-complete',
    'ready-to-submit': 'qc-complete',
    'submitting': 'qc-complete',
    'submitted': 'submitted',
    'acknowledged': 'acknowledged',
    'under-review': 'under-review',
    'approved': 'approved',
    'rejected': 'rejected',
  };
  return statusMap[status] || 'draft';
};

// Map region to description suffix
const regionLabels: Record<string, string> = {
  'fda': 'FDA',
  'ema': 'EMA',
  'pmda': 'PMDA',
  'nmpa': 'NMPA',
  'hc': 'Health Canada',
};

interface CreateSequenceParams {
  applicationId: string;
  sequenceType: SequenceDraft['sequenceType'];
  description: string;
  region: SequenceDraft['region'];
  createdBy: string;
  targetDate?: string;
}

interface UseSequenceBridgeReturn {
  /**
   * Creates a sequence in both PortfolioStore and SubmissionsStore
   * Returns the portfolio sequence ID and the draft ID
   */
  createSequence: (params: CreateSequenceParams) => { 
    portfolioSequenceId: string; 
    draftId: string;
    sequenceNumber: string;
  };
  
  /**
   * Updates the portfolio sequence status when draft status changes
   */
  syncDraftStatusToPortfolio: (draftId: string) => void;
  
  /**
   * Called when a submission is successfully sent to gateway
   * Updates portfolio sequence with submission date and status
   */
  recordSubmission: (draftId: string, trackingNumber?: string) => void;
  
  /**
   * Called when gateway acknowledges receipt
   */
  recordAcknowledgment: (draftId: string, acknowledgedDate: string, gatewayReceipt?: string) => void;
  
  /**
   * Gets the portfolio sequence ID for a draft (if one exists)
   */
  getPortfolioSequenceId: (draftId: string) => string | undefined;
}

// Store mapping between draft IDs and portfolio sequence IDs
const draftToPortfolioMap = new Map<string, string>();

/**
 * Hook that bridges SubmissionsStore and PortfolioStore for sequence operations
 */
export function useSequenceBridge(): UseSequenceBridgeReturn {
  const toast = useToast();
  
  // Portfolio store actions
  const addSequenceToPortfolio = usePortfolioStore(s => s.addSequence);
  const updateSequenceInPortfolio = usePortfolioStore(s => s.updateSequence);
  const getNextSequenceNumber = usePortfolioStore(s => s.getNextSequenceNumber);
  const getSequence = usePortfolioStore(s => s.getSequence);
  
  // Submissions store actions
  const createDraft = useSequenceBuilderStore(s => s.createDraft);
  const getDraftById = useSequenceBuilderStore(s => s.getDraftById);

  const createSequence = useCallback((params: CreateSequenceParams) => {
    // Get the next sequence number from portfolio store
    const sequenceNumber = getNextSequenceNumber(params.applicationId);
    
    // 1. Create in Portfolio Store (source of truth)
    const portfolioSequenceId = addSequenceToPortfolio({
      applicationId: params.applicationId,
      sequenceNumber,
      type: mapSequenceType(params.sequenceType),
      description: params.description || `${params.sequenceType} - ${regionLabels[params.region] || params.region}`,
      status: 'draft',
    });
    
    // 2. Create draft in Submissions Store (workflow management)
    const draftId = createDraft({
      applicationId: params.applicationId,
      sequenceNumber,
      sequenceType: params.sequenceType,
      description: params.description,
      region: params.region,
      createdBy: params.createdBy,
    });
    
    // 3. Store the mapping
    draftToPortfolioMap.set(draftId, portfolioSequenceId);
    
    return { portfolioSequenceId, draftId, sequenceNumber };
  }, [addSequenceToPortfolio, createDraft, getNextSequenceNumber]);

  const syncDraftStatusToPortfolio = useCallback((draftId: string) => {
    const draft = getDraftById(draftId);
    const portfolioSequenceId = draftToPortfolioMap.get(draftId);
    
    if (!draft || !portfolioSequenceId) return;
    
    updateSequenceInPortfolio(portfolioSequenceId, {
      status: mapDraftStatus(draft.status),
    });
  }, [getDraftById, updateSequenceInPortfolio]);

  const recordSubmission = useCallback((draftId: string, trackingNumber?: string) => {
    const draft = getDraftById(draftId);
    const portfolioSequenceId = draftToPortfolioMap.get(draftId);
    
    if (!draft || !portfolioSequenceId) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    updateSequenceInPortfolio(portfolioSequenceId, {
      status: 'submitted',
      submissionDate: today,
      gatewayReceipt: trackingNumber,
    });
    
    toast.success(`Sequence ${draft.sequenceNumber} submitted successfully`);
  }, [getDraftById, updateSequenceInPortfolio, toast]);

  const recordAcknowledgment = useCallback((draftId: string, acknowledgedDate: string, gatewayReceipt?: string) => {
    const draft = getDraftById(draftId);
    const portfolioSequenceId = draftToPortfolioMap.get(draftId);
    
    if (!draft || !portfolioSequenceId) return;
    
    updateSequenceInPortfolio(portfolioSequenceId, {
      status: 'acknowledged',
      acknowledgedDate,
      gatewayReceipt: gatewayReceipt || undefined,
    });
  }, [getDraftById, updateSequenceInPortfolio]);

  const getPortfolioSequenceId = useCallback((draftId: string) => {
    return draftToPortfolioMap.get(draftId);
  }, []);

  return {
    createSequence,
    syncDraftStatusToPortfolio,
    recordSubmission,
    recordAcknowledgment,
    getPortfolioSequenceId,
  };
}

/**
 * Hook to create a sequence and immediately open the builder
 * This is the main entry point for the "New Sequence" button
 */
export function useCreateSequenceAction() {
  const { createSequence } = useSequenceBridge();
  const toast = useToast();

  return useCallback((params: CreateSequenceParams) => {
    const result = createSequence(params);
    toast.success(`Created sequence ${result.sequenceNumber}`);
    return result;
  }, [createSequence, toast]);
}

/**
 * Hook to handle sequence submission with portfolio sync
 */
export function useSubmitSequenceAction() {
  const { recordSubmission, syncDraftStatusToPortfolio } = useSequenceBridge();
  const submitToGateway = useSequenceBuilderStore(s => s.submitToGateway);

  return useCallback(async (draftId: string, gateway: string) => {
    const result = await submitToGateway(gateway);
    
    if (result.success) {
      recordSubmission(draftId, result.trackingNumber);
    } else {
      syncDraftStatusToPortfolio(draftId);
    }
    
    return result;
  }, [submitToGateway, recordSubmission, syncDraftStatusToPortfolio]);
}

/**
 * Utility to link an existing draft to a portfolio sequence
 * Useful when loading drafts that were created before the bridge existed
 */
export function linkDraftToPortfolioSequence(draftId: string, portfolioSequenceId: string) {
  draftToPortfolioMap.set(draftId, portfolioSequenceId);
}

/**
 * Get all draft-to-portfolio mappings (for debugging/admin)
 */
export function getDraftPortfolioMappings(): Map<string, string> {
  return new Map(draftToPortfolioMap);
}
