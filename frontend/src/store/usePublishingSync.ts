

/**
 * Publishing-Sequence Sync Hook (v39)
 * 
 * Bridges the publishing workflow to sequence status updates.
 * When publishing completes successfully → sequence status updates
 * When gateway acknowledges → sequence status updates to 'acknowledged'
 * 
 * This closes the loop on the submission lifecycle:
 * Document Store → Sequence Builder → Publishing → Gateway → Status Update
 */

import { useCallback, useEffect, useRef } from 'react';
import { usePortfolioStore, type SequenceStatus } from '@/stores/portfolio-store';
import { useSequenceBuilderStore, SequenceDraft } from './useSequenceBuilderStore';
import { 
  publishingOrchestrator, 
  PublishingWorkflowState,
  WorkflowEvent,
} from '@/services/publishing-orchestrator';
import { 
  gatewayService, 
  GatewayAcknowledgment,
  AcknowledgmentType,
} from '@/services/gateway-service';
import { useToast } from '@/components/ui/Toast';

// ============================================================================
// TYPES
// ============================================================================

export interface PublishingSyncConfig {
  /** The portfolio sequence ID to sync status to */
  portfolioSequenceId: string;
  /** The submissions store draft ID (optional, for draft status sync) */
  draftId?: string;
  /** Application ID for context */
  applicationId: string;
  /** Sequence number for logging/toasts */
  sequenceNumber: string;
}

export interface PublishingSyncResult {
  success: boolean;
  finalStatus: SequenceStatus;
  trackingNumber?: string;
  acknowledgments: GatewayAcknowledgment[];
  message: string;
}

// Map gateway acknowledgment types to sequence status
const ACK_TYPE_TO_STATUS: Partial<Record<AcknowledgmentType, SequenceStatus>> = {
  // FDA ESG progression
  'TA1': 'submitted',
  'TA2': 'submitted',
  'ACK1': 'under-review',
  'ACK2': 'under-review',
  'ACK3': 'acknowledged',
  
  // EMA CESP progression
  'CESP-RECEIPT': 'submitted',
  'CESP-ACCEPT': 'acknowledged',
  'CESP-REJECT': 'rejected',
  
  // Generic
  'RECEIVED': 'submitted',
  'VALIDATED': 'submitted',
  'ACCEPTED': 'acknowledged',
  'REJECTED': 'rejected',
};

// ============================================================================
// SYNC FUNCTIONS (Non-React, for use in services)
// ============================================================================

/**
 * Updates sequence status in portfolio store based on workflow result
 * Can be called from non-React contexts
 */
export function syncPublishingResultToSequence(
  workflowState: PublishingWorkflowState,
  portfolioSequenceId: string,
  updateSequence: (id: string, updates: Record<string, unknown>) => void
): PublishingSyncResult {
  const { status, gatewayResult } = workflowState;
  
  // Determine final status based on workflow outcome
  let finalStatus: SequenceStatus = 'draft';
  let trackingNumber: string | undefined;
  const acknowledgments: GatewayAcknowledgment[] = [];
  let message = '';
  
  if (status === 'completed') {
    if (gatewayResult?.success) {
      // Gateway submission succeeded
      finalStatus = 'submitted';
      trackingNumber = gatewayResult.trackingNumber;
      acknowledgments.push(...gatewayResult.acknowledgments);
      
      // Check for more advanced acknowledgments
      for (const ack of gatewayResult.acknowledgments) {
        const mappedStatus = ACK_TYPE_TO_STATUS[ack.type];
        if (mappedStatus && getStatusPriority(mappedStatus) > getStatusPriority(finalStatus)) {
          finalStatus = mappedStatus;
        }
      }
      
      message = `Sequence submitted successfully. Tracking: ${trackingNumber}`;
    } else if (gatewayResult && !gatewayResult.success) {
      // Gateway submission failed
      finalStatus = 'rejected';
      message = `Gateway submission failed: ${gatewayResult.message}`;
    } else {
      // Publishing completed without gateway (package created but not submitted)
      finalStatus = 'qc-complete';
      message = 'Publishing package created. Ready for gateway submission.';
    }
  } else if (status === 'failed') {
    // Publishing workflow failed
    finalStatus = 'in-qc'; // Back to QC for fixing issues
    message = 'Publishing workflow failed. Please review errors and retry.';
  }
  
  // Update portfolio sequence
  const today = new Date().toISOString().split('T')[0];
  updateSequence(portfolioSequenceId, {
    status: finalStatus,
    ...(finalStatus === 'submitted' || finalStatus === 'acknowledged' ? { submissionDate: today } : {}),
    ...(trackingNumber ? { gatewayReceipt: trackingNumber } : {}),
  });
  
  return {
    success: status === 'completed' && (gatewayResult?.success ?? true),
    finalStatus,
    trackingNumber,
    acknowledgments,
    message,
  };
}

/**
 * Updates sequence status based on a new gateway acknowledgment
 */
export function syncAcknowledgmentToSequence(
  acknowledgment: GatewayAcknowledgment,
  portfolioSequenceId: string,
  updateSequence: (id: string, updates: Record<string, unknown>) => void
): SequenceStatus {
  const mappedStatus = ACK_TYPE_TO_STATUS[acknowledgment.type];
  
  if (!mappedStatus) {
    return 'submitted'; // Unknown ack type, keep as submitted
  }
  
  // Handle errors/rejections
  if (acknowledgment.status === 'error') {
    updateSequence(portfolioSequenceId, { status: 'rejected' });
    return 'rejected';
  }
  
  // Update to new status
  const updates: Record<string, unknown> = { status: mappedStatus };
  
  // Add acknowledged date if this is the final acknowledgment
  if (mappedStatus === 'acknowledged') {
    updates.acknowledgedDate = acknowledgment.receivedAt.split('T')[0];
  }
  
  // Add tracking number if present
  if (acknowledgment.parsedData.trackingNumber) {
    updates.gatewayReceipt = acknowledgment.parsedData.trackingNumber;
  }
  
  updateSequence(portfolioSequenceId, updates);
  
  return mappedStatus;
}

// Status priority for determining "most advanced" status
// Note: This is for sync purposes - acknowledged means the agency has received
// and accepted the submission, which is typically the "final" submission status
// before review begins. under-review is typically a later phase.
function getStatusPriority(status: SequenceStatus): number {
  const priorities: Record<SequenceStatus, number> = {
    'draft': 0,
    'in-qc': 1,
    'qc-complete': 2,
    'submitted': 3,
    'under-review': 4,
    'acknowledged': 5,  // Final gateway acknowledgment (ACK3, CESP-ACCEPT)
    'approved': 6,
    'rejected': -1, // Always override to rejected
  };
  return priorities[status] ?? 0;
}

// ============================================================================
// REACT HOOK
// ============================================================================

/**
 * Hook that subscribes to publishing workflow events and syncs status changes
 * to the portfolio sequence store
 */
export function usePublishingSync(config: PublishingSyncConfig | null) {
  const toast = useToast();
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  // Portfolio store actions
  const updateSequence = usePortfolioStore(s => s.updateSequence);
  const getSequence = usePortfolioStore(s => s.getSequence);
  
  // Submissions store actions
  const updateDraft = useSequenceBuilderStore(s => s.updateDraft);
  const getDraftById = useSequenceBuilderStore(s => s.getDraftById);
  
  /**
   * Start monitoring a publishing workflow and sync its completion to the sequence
   */
  const monitorWorkflow = useCallback((workflowId: string) => {
    if (!config) return;
    
    // Unsubscribe from any previous workflow
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }
    
    // Subscribe to workflow events
    unsubscribeRef.current = publishingOrchestrator.subscribe(workflowId, (event: WorkflowEvent) => {
      handleWorkflowEvent(event, workflowId);
    });
  }, [config]);
  
  const handleWorkflowEvent = useCallback((event: WorkflowEvent, workflowId: string) => {
    if (!config) return;
    
    const workflow = publishingOrchestrator.getWorkflow(workflowId);
    if (!workflow) return;
    
    switch (event.type) {
      case 'workflow-completed': {
        const result = syncPublishingResultToSequence(
          workflow,
          config.portfolioSequenceId,
          updateSequence
        );
        
        // Also update draft status if configured
        if (config.draftId) {
          const draft = getDraftById(config.draftId);
          if (draft) {
            const draftStatus = mapPortfolioStatusToDraftStatus(result.finalStatus);
            updateDraft(config.draftId, { status: draftStatus });
          }
        }
        
        // Toast notification
        if (result.success) {
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
        break;
      }
      
      case 'workflow-failed': {
        updateSequence(config.portfolioSequenceId, { status: 'in-qc' });
        
        if (config.draftId) {
          updateDraft(config.draftId, { status: 'in-progress' });
        }
        
        toast.error(`Publishing failed for sequence ${config.sequenceNumber}`);
        break;
      }
      
      case 'step-completed': {
        // Special handling for gateway submission step
        if (event.stepId === 'gateway-submission' && workflow.gatewayResult) {
          const acks = workflow.gatewayResult.acknowledgments;
          for (const ack of acks) {
            syncAcknowledgmentToSequence(ack, config.portfolioSequenceId, updateSequence);
          }
        }
        break;
      }
    }
  }, [config, updateSequence, updateDraft, getDraftById, toast]);
  
  /**
   * Manually sync a gateway acknowledgment (for polling scenarios)
   */
  const syncAcknowledgment = useCallback((acknowledgment: GatewayAcknowledgment) => {
    if (!config) return;
    
    const newStatus = syncAcknowledgmentToSequence(
      acknowledgment,
      config.portfolioSequenceId,
      updateSequence
    );
    
    // Update draft status too
    if (config.draftId) {
      const draftStatus = mapPortfolioStatusToDraftStatus(newStatus);
      updateDraft(config.draftId, { status: draftStatus });
    }
    
    // Toast for significant acknowledgments
    if (acknowledgment.type === 'ACK3' || acknowledgment.type === 'CESP-ACCEPT') {
      toast.success(`Sequence ${config.sequenceNumber} fully acknowledged by agency`);
    } else if (acknowledgment.status === 'error') {
      toast.error(`Acknowledgment error for sequence ${config.sequenceNumber}`);
    }
    
    return newStatus;
  }, [config, updateSequence, updateDraft, toast]);
  
  /**
   * Check for new acknowledgments and sync them
   */
  const pollAcknowledgments = useCallback(async (submissionId: string) => {
    if (!config) return;
    
    const acks = gatewayService.getAcknowledgments(submissionId);
    const sequence = getSequence(config.portfolioSequenceId);
    
    if (!sequence) return;
    
    // Find acknowledgments we haven't processed yet
    // (Simple heuristic: check if status would advance)
    for (const ack of acks) {
      const mappedStatus = ACK_TYPE_TO_STATUS[ack.type];
      if (mappedStatus && getStatusPriority(mappedStatus) > getStatusPriority(sequence.status)) {
        syncAcknowledgment(ack);
      }
    }
  }, [config, getSequence, syncAcknowledgment]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);
  
  return {
    monitorWorkflow,
    syncAcknowledgment,
    pollAcknowledgments,
  };
}

// Map portfolio status to draft status
function mapPortfolioStatusToDraftStatus(portfolioStatus: SequenceStatus): SequenceDraft['status'] {
  const map: Record<SequenceStatus, SequenceDraft['status']> = {
    'draft': 'draft',
    'in-qc': 'validating',
    'qc-complete': 'ready-to-submit',
    'submitted': 'submitted',
    'acknowledged': 'acknowledged',
    'under-review': 'under-review',
    'approved': 'approved',
    'rejected': 'rejected',
  };
  return map[portfolioStatus] || 'draft';
}

// ============================================================================
// CONVENIENCE HOOK FOR SIMPLE USE CASES
// ============================================================================

/**
 * Simple hook that just syncs publishing completion for a given sequence
 * Use this when you just need "publishing done → sequence updated"
 */
export function useSimplePublishingSync(
  portfolioSequenceId: string | null,
  sequenceNumber: string
) {
  const updateSequence = usePortfolioStore(s => s.updateSequence);
  const toast = useToast();
  
  /**
   * Call this when publishing completes successfully
   */
  const onPublishingComplete = useCallback((
    trackingNumber?: string,
    gatewayUsed?: string
  ) => {
    if (!portfolioSequenceId) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    updateSequence(portfolioSequenceId, {
      status: trackingNumber ? 'submitted' : 'qc-complete',
      submissionDate: trackingNumber ? today : undefined,
      gatewayReceipt: trackingNumber,
    });
    
    if (trackingNumber) {
      toast.success(`Sequence ${sequenceNumber} submitted to ${gatewayUsed || 'gateway'}. Tracking: ${trackingNumber}`);
    } else {
      toast.success(`Sequence ${sequenceNumber} publishing package complete`);
    }
  }, [portfolioSequenceId, sequenceNumber, updateSequence, toast]);
  
  /**
   * Call this when gateway acknowledges the submission
   */
  const onAcknowledged = useCallback((acknowledgedDate?: string) => {
    if (!portfolioSequenceId) return;
    
    updateSequence(portfolioSequenceId, {
      status: 'acknowledged',
      acknowledgedDate: acknowledgedDate || new Date().toISOString().split('T')[0],
    });
    
    toast.success(`Sequence ${sequenceNumber} acknowledged by agency`);
  }, [portfolioSequenceId, sequenceNumber, updateSequence, toast]);
  
  /**
   * Call this if publishing or submission fails
   */
  const onPublishingFailed = useCallback((errorMessage?: string) => {
    if (!portfolioSequenceId) return;
    
    updateSequence(portfolioSequenceId, {
      status: 'in-qc',
    });
    
    toast.error(errorMessage || `Publishing failed for sequence ${sequenceNumber}`);
  }, [portfolioSequenceId, sequenceNumber, updateSequence, toast]);
  
  return {
    onPublishingComplete,
    onAcknowledged,
    onPublishingFailed,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  ACK_TYPE_TO_STATUS,
  getStatusPriority,
};
