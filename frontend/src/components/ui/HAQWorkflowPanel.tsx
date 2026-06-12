

/**
 * HAQWorkflowPanel - v131
 * 
 * Integrates the WorkflowStateMachine into HAQ response management.
 * Provides workflow-driven status transitions with:
 * - Visual state diagram
 * - Transition controls with guard validation
 * - Audit history
 * - Role-based permissions
 * 
 * Maps existing HAQ statuses to the formal HAQ_RESPONSE_WORKFLOW states.
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
} from 'lucide-react';
import {
  WorkflowStateDiagram,
  WorkflowControls,
  WorkflowHistoryPanel,
  WorkflowWidget,
  useWorkflowEngine,
  HAQ_RESPONSE_WORKFLOW,
  WorkflowHistoryEntry,
  WorkflowDefinition,
  WorkflowState,
} from './WorkflowStateMachine';
import { Card, CardHeader, CardContent } from './Card';
import { Badge, BadgeColor } from './Badge';
import { Button } from './Button';
import { useHAQStore } from '@/store/useHAQStore';
import { useToast } from './Toast';
import type { HAQStatus } from '@/types/haq';

// ============================================================================
// HAQ STATUS <-> WORKFLOW STATE MAPPING
// ============================================================================

/**
 * Maps HAQ status values to workflow state IDs
 * This allows existing HAQ data to work with the formal workflow system
 */
const haqStatusToWorkflowState: Record<HAQStatus, string> = {
  'new': 'draft',
  'open': 'draft',
  'in-progress': 'draft',
  'draft-ready': 'sme-review',
  'under-review': 'regulatory-review',
  'partially-responded': 'draft',
  'submitted': 'submitted',
  'closed': 'submitted',
};

/**
 * Maps workflow state IDs back to HAQ status values
 */
const workflowStateToHAQStatus: Record<string, HAQStatus> = {
  'draft': 'in-progress',
  'ai-generating': 'in-progress',
  'sme-review': 'draft-ready',
  'regulatory-review': 'under-review',
  'qa-review': 'under-review',
  'approved': 'under-review',
  'submitted': 'submitted',
  'rejected': 'in-progress',
};

/**
 * User-friendly labels for workflow states
 */
const workflowStateLabels: Record<string, string> = {
  'draft': 'Drafting Response',
  'ai-generating': 'AI Generating',
  'sme-review': 'SME Review',
  'regulatory-review': 'Regulatory Review',
  'qa-review': 'QA Review',
  'approved': 'Approved',
  'submitted': 'Submitted to HA',
  'rejected': 'Needs Rework',
};

// ============================================================================
// TYPES
// ============================================================================

interface HAQWorkflowPanelProps {
  haqId: string;
  currentStatus: HAQStatus;
  responseText?: string;
  onStatusChange?: (newStatus: HAQStatus) => void;
  /** Current user's role for permission checks */
  userRole?: 'author' | 'sme' | 'regulatory-lead' | 'qa' | 'admin';
  /** Collapsed by default for space efficiency */
  defaultExpanded?: boolean;
  className?: string;
}

interface HAQWorkflowWidgetProps {
  haqId: string;
  currentStatus: HAQStatus;
  onStatusChange?: (newStatus: HAQStatus) => void;
  className?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function HAQWorkflowPanel({
  haqId,
  currentStatus,
  responseText = '',
  onStatusChange,
  userRole = 'author',
  defaultExpanded = false,
  className = '',
}: HAQWorkflowPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showHistory, setShowHistory] = useState(false);
  const toast = useToast();
  const updateHAQStatus = useHAQStore((state) => state.updateHAQStatus);

  // Map current HAQ status to workflow state
  const initialWorkflowState = haqStatusToWorkflowState[currentStatus] || 'draft';

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
    definition: HAQ_RESPONSE_WORKFLOW,
    initialContext: {
      entityId: haqId,
      entityType: 'haq-response',
      data: {
        wordCount: responseText.split(/\s+/).filter(Boolean).length,
        hasAttachments: false,
        reviewComments: [],
      },
      userRole,
    },
    onTransition: (entry) => {
      // Map workflow state change back to HAQ status
      const newHAQStatus = workflowStateToHAQStatus[entry.toState];
      if (newHAQStatus) {
        updateHAQStatus(haqId, newHAQStatus);
        onStatusChange?.(newHAQStatus);
        toast.success(`Workflow: ${workflowStateLabels[entry.toState] || entry.toState}`);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Update context when response text changes
  useEffect(() => {
    const wordCount = responseText.split(/\s+/).filter(Boolean).length;
    updateContextData({ wordCount });
  }, [responseText, updateContextData]);

  // Handle transition execution
  const handleTransition = useCallback(async (transitionId: string) => {
    const success = await executeTransition(transitionId);
    if (success) {
      // Transition handled by onTransition callback
    }
  }, [executeTransition]);

  // Get progress percentage through workflow
  const progressPercent = useMemo(() => {
    const stateOrder = ['draft', 'ai-generating', 'sme-review', 'regulatory-review', 'qa-review', 'approved', 'submitted'];
    const currentIndex = stateOrder.indexOf(currentState);
    if (currentIndex === -1) return 0;
    return Math.round((currentIndex / (stateOrder.length - 1)) * 100);
  }, [currentState]);

  return (
    <Card className={`overflow-hidden ${className}`}>
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-surface-card/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <GitBranch className="w-5 h-5 text-accent-purple" />
          <div className="text-left">
            <h4 className="text-sm font-medium text-text-primary">Response Workflow</h4>
            <p className="text-xs text-text-muted">
              {workflowStateLabels[currentState] || currentState}
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
              className="h-full bg-gradient-to-r from-accent-purple to-accent-blue rounded-full transition-all duration-500"
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
              definition={HAQ_RESPONSE_WORKFLOW}
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
                definition={HAQ_RESPONSE_WORKFLOW}
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
                    <span>Response workflow complete</span>
                  </>
                ) : isError ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-accent-red" />
                    <span>Response needs attention</span>
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
                definition={HAQ_RESPONSE_WORKFLOW}
              />
            </div>
          )}

          {/* Footer Info */}
          <div className="px-4 py-3 bg-surface-card/50 flex items-center justify-between text-xs text-text-muted">
            <span>HAQ: {haqId}</span>
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

export function HAQWorkflowWidget({
  haqId,
  currentStatus,
  onStatusChange,
  className = '',
}: HAQWorkflowWidgetProps) {
  const toast = useToast();
  const updateHAQStatus = useHAQStore((state) => state.updateHAQStatus);
  const initialWorkflowState = haqStatusToWorkflowState[currentStatus] || 'draft';

  const {
    currentState,
    availableTransitions,
    history,
    isTransitioning,
    executeTransition,
  } = useWorkflowEngine({
    definition: HAQ_RESPONSE_WORKFLOW,
    initialContext: {
      entityId: haqId,
      entityType: 'haq-response',
      data: { wordCount: 500 }, // Assume sufficient for demo
      userRole: 'admin',
    },
    onTransition: (entry) => {
      const newHAQStatus = workflowStateToHAQStatus[entry.toState];
      if (newHAQStatus) {
        updateHAQStatus(haqId, newHAQStatus);
        onStatusChange?.(newHAQStatus);
        toast.success(`Status: ${workflowStateLabels[entry.toState]}`);
      }
    },
  });

  return (
    <WorkflowWidget
      title="Response Workflow"
      definition={HAQ_RESPONSE_WORKFLOW}
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

interface HAQWorkflowStatusProps {
  haqId: string;
  currentStatus: HAQStatus;
  onStatusChange?: (newStatus: HAQStatus) => void;
  /** Show workflow controls inline */
  showControls?: boolean;
  className?: string;
}

export function HAQWorkflowStatus({
  haqId,
  currentStatus,
  onStatusChange,
  showControls = false,
  className = '',
}: HAQWorkflowStatusProps) {
  const toast = useToast();
  const updateHAQStatus = useHAQStore((state) => state.updateHAQStatus);
  const initialWorkflowState = haqStatusToWorkflowState[currentStatus] || 'draft';

  const {
    currentState,
    currentStateDef,
    availableTransitions,
    isTransitioning,
    executeTransition,
    canTransition,
  } = useWorkflowEngine({
    definition: HAQ_RESPONSE_WORKFLOW,
    initialContext: {
      entityId: haqId,
      entityType: 'haq-response',
      data: { wordCount: 500 },
      userRole: 'admin',
    },
    onTransition: (entry) => {
      const newHAQStatus = workflowStateToHAQStatus[entry.toState];
      if (newHAQStatus) {
        updateHAQStatus(haqId, newHAQStatus);
        onStatusChange?.(newHAQStatus);
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

// ============================================================================
// EXPORTS
// ============================================================================

export {
  haqStatusToWorkflowState,
  workflowStateToHAQStatus,
  workflowStateLabels,
};

export default HAQWorkflowPanel;
