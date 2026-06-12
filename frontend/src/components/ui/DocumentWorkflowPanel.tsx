
/**
 * DocumentWorkflowPanel - v132
 * 
 * Integrates the WorkflowStateMachine into document authoring lifecycle.
 * Provides workflow-driven status transitions with:
 * - Visual state diagram
 * - Transition controls with guard validation
 * - Audit history
 * - Role-based permissions
 * 
 * Maps existing document statuses to the formal DOCUMENT_WORKFLOW states.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  GitBranch,
  History,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  Zap,
  Eye,
  Edit3,
  Send,
  FileText,
  MessageSquare,
  Lock,
  Archive,
} from 'lucide-react';
import {
  WorkflowStateDiagram,
  WorkflowControls,
  WorkflowHistoryPanel,
  WorkflowWidget,
  useWorkflowEngine,
  DOCUMENT_WORKFLOW,
  WorkflowHistoryEntry,
  WorkflowDefinition,
  WorkflowState,
} from './WorkflowStateMachine';
import { Card, CardHeader, CardContent } from './Card';
import { Badge, BadgeColor } from './Badge';
import { Button } from './Button';
import { useToast } from './Toast';
import type { DocumentStatus } from '@/types/authoring';

// ============================================================================
// DOCUMENT STATUS <-> WORKFLOW STATE MAPPING
// ============================================================================

/**
 * Maps document status values to workflow state IDs
 * This allows existing document data to work with the formal workflow system
 */
const documentStatusToWorkflowStateMap: Record<DocumentStatus, string> = {
  'not-started': 'draft',
  'prerequisites-pending': 'draft',
  'ready-to-start': 'draft',
  'drafting': 'draft',
  'internal-review': 'in-review',
  'cross-functional-review': 'in-review',
  'qc-review': 'in-review',
  'final-review': 'in-review',
  'approved': 'approved',
  'submission-ready': 'published',
  'superseded': 'archived',
};

/**
 * Maps workflow state IDs back to document status values
 */
const workflowStateToDocumentStatusMap: Record<string, DocumentStatus> = {
  'draft': 'drafting',
  'in-review': 'internal-review',
  'changes-requested': 'drafting',
  'approved': 'approved',
  'published': 'submission-ready',
  'archived': 'superseded',
};

/**
 * User-friendly labels for workflow states
 */
const documentWorkflowStateLabelMap: Record<string, string> = {
  'draft': 'Drafting',
  'in-review': 'Under Review',
  'changes-requested': 'Changes Requested',
  'approved': 'Approved',
  'published': 'Published',
  'archived': 'Archived',
};

// Export the mappings
export const documentStatusToWorkflowState = documentStatusToWorkflowStateMap;
export const workflowStateToDocumentStatus = workflowStateToDocumentStatusMap;
export const documentWorkflowStateLabels = documentWorkflowStateLabelMap;

// ============================================================================
// TYPES
// ============================================================================

interface DocumentWorkflowPanelProps {
  documentId: string;
  currentStatus: DocumentStatus;
  documentTitle?: string;
  progress?: number;
  onStatusChange?: (newStatus: DocumentStatus) => void;
  /** Current user's role for permission checks */
  userRole?: 'author' | 'reviewer' | 'approver' | 'publisher' | 'admin';
  /** Collapsed by default for space efficiency */
  defaultExpanded?: boolean;
  className?: string;
}

interface DocumentWorkflowWidgetProps {
  documentId: string;
  currentStatus: DocumentStatus;
  onStatusChange?: (newStatus: DocumentStatus) => void;
  className?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DocumentWorkflowPanel({
  documentId,
  currentStatus,
  documentTitle = '',
  progress = 0,
  onStatusChange,
  userRole = 'author',
  defaultExpanded = false,
  className = '',
}: DocumentWorkflowPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showHistory, setShowHistory] = useState(false);
  const toast = useToast();

  // Map current document status to workflow state
  const initialWorkflowState = documentStatusToWorkflowState[currentStatus] || 'draft';

  // Initialize workflow engine
  const {
    currentState,
    currentStateDef,
    availableTransitions,
    history,
    isTransitioning,
    isComplete,
    isError,
    executeTransition,
    triggerEvent,
    canTransition,
    updateContextData,
  } = useWorkflowEngine({
    definition: DOCUMENT_WORKFLOW,
    initialContext: {
      entityId: documentId,
      entityType: 'document',
      data: {
        progress,
        hasUnresolvedComments: false,
        reviewersApproved: 0,
        reviewersTotal: 3,
      },
      userRole,
    },
    onTransition: (entry) => {
      // Map workflow state change back to document status
      const newDocStatus = workflowStateToDocumentStatus[entry.toState];
      if (newDocStatus) {
        onStatusChange?.(newDocStatus);
        toast.success(`Document: ${documentWorkflowStateLabels[entry.toState] || entry.toState}`);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Update context when progress changes
  useEffect(() => {
    updateContextData({ progress });
  }, [progress, updateContextData]);

  // Handle transition execution
  const handleTransition = useCallback(async (transitionId: string) => {
    const success = await executeTransition(transitionId);
    if (success) {
      // Transition handled by onTransition callback
    }
  }, [executeTransition]);

  // Get progress percentage through workflow
  const progressPercent = useMemo(() => {
    const stateOrder = ['draft', 'in-review', 'changes-requested', 'approved', 'published', 'archived'];
    const currentIndex = stateOrder.indexOf(currentState);
    if (currentIndex === -1) return 0;
    // Exclude archived from calculation
    return Math.round((currentIndex / 4) * 100);
  }, [currentState]);

  return (
    <Card className={`overflow-hidden ${className}`}>
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-surface-card/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <GitBranch className="w-5 h-5 text-accent-blue" />
          <div className="text-left">
            <h4 className="text-sm font-medium text-text-primary">Document Workflow</h4>
            <p className="text-xs text-text-muted">
              {documentWorkflowStateLabels[currentState] || currentState}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <Badge color={currentStateDef?.color || 'slate'} size="sm">
            {currentStateDef?.icon}
            {currentStateDef?.name || currentState}
          </Badge>
          {/* Progress Indicator */}
          <div className="w-16 h-1.5 bg-surface-card rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-accent-blue to-accent-green rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-text-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-muted" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-border">
          {/* State Diagram */}
          <div className="p-4 border-b border-border">
            <WorkflowStateDiagram
              definition={DOCUMENT_WORKFLOW}
              currentState={currentState}
              history={history}
              compact={false}
            />
          </div>

          {/* Controls */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-sm font-medium text-text-primary">Available Actions</h5>
              <span className="text-xs text-text-muted">Role: {userRole}</span>
            </div>
            
            {availableTransitions.length > 0 ? (
              <WorkflowControls
                definition={DOCUMENT_WORKFLOW}
                currentState={currentState}
                availableTransitions={availableTransitions}
                isTransitioning={isTransitioning}
                onTransition={handleTransition}
                canTransition={canTransition}
              />
            ) : (
              <div className="flex items-center gap-2 text-sm text-text-muted">
                {isComplete ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-accent-green" />
                    <span>Document workflow complete</span>
                  </>
                ) : isError ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-accent-red" />
                    <span>Document needs attention</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>Awaiting action...</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* History Toggle */}
          <div className="px-4 py-2 border-b border-border">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <History className="w-4 h-4" />
              <span>Workflow History ({history.length})</span>
              {showHistory ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          </div>

          {/* History Panel */}
          {showHistory && (
            <div className="p-4 max-h-64 overflow-auto">
              <WorkflowHistoryPanel
                history={history}
                definition={DOCUMENT_WORKFLOW}
              />
            </div>
          )}

          {/* Footer Info */}
          <div className="px-4 py-3 bg-surface-card/50 flex items-center justify-between text-xs text-text-muted">
            <span>Document: {documentId}</span>
            <span>{progressPercent}% complete</span>
          </div>
        </div>
      )}
    </Card>
  );
}

// ============================================================================
// COMPACT WIDGET VERSION
// ============================================================================

export function DocumentWorkflowWidget({
  documentId,
  currentStatus,
  onStatusChange,
  className = '',
}: DocumentWorkflowWidgetProps) {
  const toast = useToast();
  const initialWorkflowState = documentStatusToWorkflowState[currentStatus] || 'draft';

  const {
    currentState,
    availableTransitions,
    history,
    isTransitioning,
    executeTransition,
  } = useWorkflowEngine({
    definition: DOCUMENT_WORKFLOW,
    initialContext: {
      entityId: documentId,
      entityType: 'document',
      data: { progress: 75 }, // Assume good progress for demo
      userRole: 'admin',
    },
    onTransition: (entry) => {
      const newDocStatus = workflowStateToDocumentStatus[entry.toState];
      if (newDocStatus) {
        onStatusChange?.(newDocStatus);
        toast.success(`Status: ${documentWorkflowStateLabels[entry.toState]}`);
      }
    },
  });

  return (
    <WorkflowWidget
      title="Document Workflow"
      definition={DOCUMENT_WORKFLOW}
      currentState={currentState}
      history={history}
      availableTransitions={availableTransitions}
      onTransition={(id) => executeTransition(id)}
      isTransitioning={isTransitioning}
      className={className}
    />
  );
}

// ============================================================================
// INLINE STATUS WITH WORKFLOW
// ============================================================================

interface DocumentWorkflowStatusProps {
  documentId: string;
  currentStatus: DocumentStatus;
  onStatusChange?: (newStatus: DocumentStatus) => void;
  /** Show workflow controls inline */
  showControls?: boolean;
  className?: string;
}

export function DocumentWorkflowStatus({
  documentId,
  currentStatus,
  onStatusChange,
  showControls = false,
  className = '',
}: DocumentWorkflowStatusProps) {
  const toast = useToast();
  const initialWorkflowState = documentStatusToWorkflowState[currentStatus] || 'draft';

  const {
    currentState,
    currentStateDef,
    availableTransitions,
    isTransitioning,
    executeTransition,
    canTransition,
  } = useWorkflowEngine({
    definition: DOCUMENT_WORKFLOW,
    initialContext: {
      entityId: documentId,
      entityType: 'document',
      data: { progress: 75 },
      userRole: 'admin',
    },
    onTransition: (entry) => {
      const newDocStatus = workflowStateToDocumentStatus[entry.toState];
      if (newDocStatus) {
        onStatusChange?.(newDocStatus);
      }
    },
  });

  const nextTransition = availableTransitions[0];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Current State Badge */}
      <Badge color={currentStateDef?.color || 'slate'} size="sm">
        {currentStateDef?.icon}
        {currentStateDef?.name || currentState}
      </Badge>

      {/* Quick Action Button */}
      {showControls && nextTransition && (
        <Button
          variant="ghost"
          size="xs"
          onClick={() => executeTransition(nextTransition.id)}
          disabled={isTransitioning}
          className="gap-1"
        >
          {nextTransition.label || nextTransition.event}
        </Button>
      )}
    </div>
  );
}

export default DocumentWorkflowPanel;
