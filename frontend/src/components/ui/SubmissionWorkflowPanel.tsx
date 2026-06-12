
/**
 * SubmissionWorkflowPanel - v132
 * 
 * Integrates the WorkflowStateMachine into eCTD submission lifecycle.
 * Provides workflow-driven status transitions with:
 * - Visual state diagram for submission pipeline
 * - Validation status integration
 * - Gateway submission tracking
 * - Audit history for regulatory compliance
 * 
 * Maps existing submission statuses to the formal SUBMISSION_WORKFLOW states.
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
  XCircle,
  Package,
  Shield,
  Upload,
} from 'lucide-react';
import {
  WorkflowStateDiagram,
  WorkflowControls,
  WorkflowHistoryPanel,
  WorkflowWidget,
  useWorkflowEngine,
  SUBMISSION_WORKFLOW,
  WorkflowHistoryEntry,
  WorkflowDefinition,
  WorkflowState,
} from './WorkflowStateMachine';
import { Card, CardHeader, CardContent } from './Card';
import { Badge, BadgeColor } from './Badge';
import { Button } from './Button';
import { useToast } from './Toast';

// ============================================================================
// SUBMISSION STATUS <-> WORKFLOW STATE MAPPING
// ============================================================================

/** Common submission status types used across the platform */
export type SubmissionWorkflowStatus = 
  | 'planning' 
  | 'assembling' 
  | 'validating' 
  | 'validation-failed'
  | 'ready' 
  | 'submitting' 
  | 'submitted' 
  | 'acknowledged'
  | 'rejected';

/**
 * Maps submission status values to workflow state IDs
 */
const submissionStatusToWorkflowStateMap: Record<SubmissionWorkflowStatus, string> = {
  'planning': 'planning',
  'assembling': 'assembling',
  'validating': 'validating',
  'validation-failed': 'validation-failed',
  'ready': 'ready-for-gateway',
  'submitting': 'gateway-submission',
  'submitted': 'gateway-submission',
  'acknowledged': 'gateway-acknowledged',
  'rejected': 'gateway-rejected',
};

/**
 * Maps workflow state IDs back to submission status values
 */
const workflowStateToSubmissionStatusMap: Record<string, SubmissionWorkflowStatus> = {
  'planning': 'planning',
  'assembling': 'assembling',
  'validating': 'validating',
  'validation-failed': 'validation-failed',
  'ready-for-gateway': 'ready',
  'gateway-submission': 'submitting',
  'gateway-acknowledged': 'acknowledged',
  'gateway-rejected': 'rejected',
};

/**
 * User-friendly labels for workflow states
 */
const submissionWorkflowStateLabelMap: Record<string, string> = {
  'planning': 'Planning Submission',
  'assembling': 'Assembling Package',
  'validating': 'Running Validation',
  'validation-failed': 'Validation Failed',
  'ready-for-gateway': 'Ready for Gateway',
  'gateway-submission': 'Submitting to Gateway',
  'gateway-acknowledged': 'Gateway Acknowledged',
  'gateway-rejected': 'Gateway Rejected',
};

// Export the mappings
export const submissionStatusToWorkflowState = submissionStatusToWorkflowStateMap;
export const workflowStateToSubmissionStatus = workflowStateToSubmissionStatusMap;
export const submissionWorkflowStateLabels = submissionWorkflowStateLabelMap;

// ============================================================================
// TYPES
// ============================================================================

interface SubmissionWorkflowPanelProps {
  submissionId: string;
  sequenceId?: string;
  currentStatus: SubmissionWorkflowStatus;
  submissionTitle?: string;
  /** Validation results for guard checks */
  validationResult?: {
    passed: boolean;
    errors: number;
    warnings: number;
  };
  onStatusChange?: (newStatus: SubmissionWorkflowStatus) => void;
  /** Current user's role for permission checks */
  userRole?: 'author' | 'validator' | 'submitter' | 'admin';
  /** Collapsed by default for space efficiency */
  defaultExpanded?: boolean;
  className?: string;
}

interface SubmissionWorkflowWidgetProps {
  submissionId: string;
  currentStatus: SubmissionWorkflowStatus;
  onStatusChange?: (newStatus: SubmissionWorkflowStatus) => void;
  className?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SubmissionWorkflowPanel({
  submissionId,
  sequenceId,
  currentStatus,
  submissionTitle = '',
  validationResult,
  onStatusChange,
  userRole = 'author',
  defaultExpanded = false,
  className = '',
}: SubmissionWorkflowPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showHistory, setShowHistory] = useState(false);
  const toast = useToast();

  // Map current submission status to workflow state
  const initialWorkflowState = submissionStatusToWorkflowState[currentStatus] || 'planning';

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
    definition: SUBMISSION_WORKFLOW,
    initialContext: {
      entityId: submissionId,
      entityType: 'submission',
      data: {
        sequenceId,
        validationPassed: validationResult?.passed ?? false,
        validationErrors: validationResult?.errors ?? 0,
        validationWarnings: validationResult?.warnings ?? 0,
      },
      userRole,
    },
    onTransition: (entry) => {
      // Map workflow state change back to submission status
      const newSubmissionStatus = workflowStateToSubmissionStatus[entry.toState];
      if (newSubmissionStatus) {
        onStatusChange?.(newSubmissionStatus);
        toast.success(`Submission: ${submissionWorkflowStateLabels[entry.toState] || entry.toState}`);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Update context when validation result changes
  useEffect(() => {
    if (validationResult) {
      updateContextData({
        validationPassed: validationResult.passed,
        validationErrors: validationResult.errors,
        validationWarnings: validationResult.warnings,
      });
    }
  }, [validationResult, updateContextData]);

  // Handle transition execution
  const handleTransition = useCallback(async (transitionId: string) => {
    const success = await executeTransition(transitionId);
    if (success) {
      // Transition handled by onTransition callback
    }
  }, [executeTransition]);

  // Get progress percentage through workflow
  const progressPercent = useMemo(() => {
    const stateOrder = ['planning', 'assembling', 'validating', 'ready-for-gateway', 'gateway-submission', 'gateway-acknowledged'];
    const currentIndex = stateOrder.indexOf(currentState);
    if (currentIndex === -1) return 0;
    return Math.round((currentIndex / (stateOrder.length - 1)) * 100);
  }, [currentState]);

  // Get color based on state type
  const getHeaderGradient = () => {
    if (isError || currentState === 'validation-failed' || currentState === 'gateway-rejected') {
      return 'from-red-500 to-amber-500';
    }
    if (isComplete) {
      return 'from-accent-green to-accent-teal';
    }
    return 'from-accent-purple to-accent-blue';
  };

  return (
    <Card className={`overflow-hidden ${className}`}>
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-surface-card/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-accent-purple" />
          <div className="text-left">
            <h4 className="text-sm font-medium text-text-primary">Submission Workflow</h4>
            <p className="text-xs text-text-muted">
              {submissionWorkflowStateLabels[currentState] || currentState}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Validation Status (if available) */}
          {validationResult && (
            <div className="flex items-center gap-1">
              {validationResult.passed ? (
                <CheckCircle className="w-4 h-4 text-accent-green" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              {validationResult.errors > 0 && (
                <span className="text-xs text-red-400">{validationResult.errors}E</span>
              )}
              {validationResult.warnings > 0 && (
                <span className="text-xs text-amber-400">{validationResult.warnings}W</span>
              )}
            </div>
          )}
          {/* Status Badge */}
          <Badge color={currentStateDef?.color || 'slate'} size="sm">
            {currentStateDef?.icon}
            {currentStateDef?.name || currentState}
          </Badge>
          {/* Progress Indicator */}
          <div className="w-16 h-1.5 bg-surface-card rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${getHeaderGradient()} rounded-full transition-all duration-500`}
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
              definition={SUBMISSION_WORKFLOW}
              currentState={currentState}
              history={history}
              compact={false}
            />
          </div>

          {/* Validation Summary (if in validation-related state) */}
          {validationResult && (currentState === 'validating' || currentState === 'validation-failed' || currentState === 'ready-for-gateway') && (
            <div className="p-4 border-b border-border">
              <h5 className="text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                eCTD Validation Results
              </h5>
              <div className="grid grid-cols-3 gap-3">
                <div className={`p-3 rounded-lg ${validationResult.passed ? 'bg-accent-green/10' : 'bg-red-500/10'}`}>
                  <div className="text-lg font-semibold text-text-primary">
                    {validationResult.passed ? 'Passed' : 'Failed'}
                  </div>
                  <div className="text-xs text-text-muted">Overall Status</div>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10">
                  <div className="text-lg font-semibold text-red-400">
                    {validationResult.errors}
                  </div>
                  <div className="text-xs text-text-muted">Errors</div>
                </div>
                <div className="p-3 rounded-lg bg-amber-500/10">
                  <div className="text-lg font-semibold text-amber-400">
                    {validationResult.warnings}
                  </div>
                  <div className="text-xs text-text-muted">Warnings</div>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-sm font-medium text-text-primary">Available Actions</h5>
              <span className="text-xs text-text-muted">Role: {userRole}</span>
            </div>
            
            {availableTransitions.length > 0 ? (
              <WorkflowControls
                definition={SUBMISSION_WORKFLOW}
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
                    <span>Submission acknowledged by gateway</span>
                  </>
                ) : isError || currentState === 'validation-failed' || currentState === 'gateway-rejected' ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-accent-red" />
                    <span>Submission needs attention</span>
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
              <span>Submission History ({history.length})</span>
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
                definition={SUBMISSION_WORKFLOW}
              />
            </div>
          )}

          {/* Footer Info */}
          <div className="px-4 py-3 bg-surface-card/50 flex items-center justify-between text-xs text-text-muted">
            <span>
              Submission: {submissionId}
              {sequenceId && <span className="ml-2">| Sequence: {sequenceId}</span>}
            </span>
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

export function SubmissionWorkflowWidget({
  submissionId,
  currentStatus,
  onStatusChange,
  className = '',
}: SubmissionWorkflowWidgetProps) {
  const toast = useToast();
  const initialWorkflowState = submissionStatusToWorkflowState[currentStatus] || 'planning';

  const {
    currentState,
    availableTransitions,
    history,
    isTransitioning,
    executeTransition,
  } = useWorkflowEngine({
    definition: SUBMISSION_WORKFLOW,
    initialContext: {
      entityId: submissionId,
      entityType: 'submission',
      data: { 
        validationPassed: true, // Assume passed for demo
        validationErrors: 0,
        validationWarnings: 2,
      },
      userRole: 'admin',
    },
    onTransition: (entry) => {
      const newStatus = workflowStateToSubmissionStatus[entry.toState];
      if (newStatus) {
        onStatusChange?.(newStatus);
        toast.success(`Status: ${submissionWorkflowStateLabels[entry.toState]}`);
      }
    },
  });

  return (
    <WorkflowWidget
      title="Submission Workflow"
      definition={SUBMISSION_WORKFLOW}
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

interface SubmissionWorkflowStatusBadgeProps {
  submissionId: string;
  currentStatus: SubmissionWorkflowStatus;
  onStatusChange?: (newStatus: SubmissionWorkflowStatus) => void;
  /** Show workflow controls inline */
  showControls?: boolean;
  className?: string;
}

export function SubmissionWorkflowStatusBadge({
  submissionId,
  currentStatus,
  onStatusChange,
  showControls = false,
  className = '',
}: SubmissionWorkflowStatusBadgeProps) {
  const toast = useToast();
  const initialWorkflowState = submissionStatusToWorkflowState[currentStatus] || 'planning';

  const {
    currentState,
    currentStateDef,
    availableTransitions,
    isTransitioning,
    executeTransition,
    canTransition,
  } = useWorkflowEngine({
    definition: SUBMISSION_WORKFLOW,
    initialContext: {
      entityId: submissionId,
      entityType: 'submission',
      data: { validationPassed: true },
      userRole: 'admin',
    },
    onTransition: (entry) => {
      const newStatus = workflowStateToSubmissionStatus[entry.toState];
      if (newStatus) {
        onStatusChange?.(newStatus);
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

export default SubmissionWorkflowPanel;
