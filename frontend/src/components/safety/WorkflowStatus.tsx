
/**
 * ICSR Workflow Status Component
 * Displays current workflow status with progress bar and available transitions
 * 
 * @version 0.13.27
 */


import { useState, useEffect, useCallback } from 'react';
import {
  FileEdit, ClipboardList, Stethoscope, CheckSquare, CheckCircle2, Send, Archive,
  ChevronRight, Loader2, AlertCircle, MessageSquare, History, RefreshCw,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  ICSRWorkflowStatus,
  WorkflowRole,
  WorkflowTransitionResponse,
  AvailableTransition,
  WorkflowHistoryEntry,
  workflowApi,
} from '@/lib/safety-api';
import {
  WORKFLOW_STATUS_LABELS,
  WORKFLOW_STATUS_COLORS,
  WORKFLOW_ORDER,
  getWorkflowProgress,
} from '@/lib/icsr-workflow';
import { useToast } from '@/components/ui/Toast';

// =============================================================================
// TYPES
// =============================================================================

interface WorkflowStatusProps {
  caseId: string;
  caseNumber: string;
  initialStatus?: ICSRWorkflowStatus;
  userRole?: WorkflowRole;
  userId?: string;
  userName?: string;
  onStatusChange?: (newStatus: ICSRWorkflowStatus) => void;
  compact?: boolean;
}

// =============================================================================
// ICON MAPPING
// =============================================================================

const STATUS_ICONS: Record<ICSRWorkflowStatus, React.ReactNode> = {
  DRAFT: <FileEdit className="w-4 h-4" />,
  DATA_ENTRY: <ClipboardList className="w-4 h-4" />,
  MEDICAL_REVIEW: <Stethoscope className="w-4 h-4" />,
  QC_REVIEW: <CheckSquare className="w-4 h-4" />,
  READY: <CheckCircle2 className="w-4 h-4" />,
  SUBMITTED: <Send className="w-4 h-4" />,
  CLOSED: <Archive className="w-4 h-4" />,
};

// =============================================================================
// WORKFLOW STATUS COMPONENT
// =============================================================================

export function WorkflowStatus({
  caseId,
  caseNumber,
  initialStatus = 'DRAFT',
  userRole = 'SAFETY',
  userId,
  userName,
  onStatusChange,
  compact = false,
}: WorkflowStatusProps) {
  const toast = useToast();
  
  const [currentStatus, setCurrentStatus] = useState<ICSRWorkflowStatus>(initialStatus);
  const [availableTransitions, setAvailableTransitions] = useState<AvailableTransition[]>([]);
  const [history, setHistory] = useState<WorkflowHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [pendingTransition, setPendingTransition] = useState<AvailableTransition | null>(null);
  const [comment, setComment] = useState('');

  // Load workflow info
  const loadWorkflowInfo = useCallback(async () => {
    if (!caseId) return;
    
    setLoading(true);
    try {
      const info = await workflowApi.getInfo(caseId, userRole);
      setCurrentStatus(info.currentStatus);
      setAvailableTransitions(info.availableTransitions);
      setHistory(info.history);
    } catch (error) {
      console.error('Failed to load workflow info:', error);
      // Use initial status if API fails
      setAvailableTransitions([]);
    } finally {
      setLoading(false);
    }
  }, [caseId, userRole]);

  useEffect(() => {
    loadWorkflowInfo();
  }, [loadWorkflowInfo]);

  // Execute transition
  const executeTransition = async (transition: AvailableTransition, transitionComment?: string) => {
    setTransitioning(true);
    try {
      const result: WorkflowTransitionResponse = await workflowApi.transition({
        caseId,
        targetStatus: transition.targetStatus,
        comment: transitionComment,
        userId,
        userName,
        userRole,
      });

      setCurrentStatus(result.newStatus);
      onStatusChange?.(result.newStatus);
      
      toast.success(result.message);

      // Reload to get updated transitions
      await loadWorkflowInfo();
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setTransitioning(false);
      setShowCommentModal(false);
      setPendingTransition(null);
      setComment('');
    }
  };

  // Handle transition click
  const handleTransitionClick = (transition: AvailableTransition) => {
    if (transition.requiresComment) {
      setPendingTransition(transition);
      setShowCommentModal(true);
    } else {
      executeTransition(transition);
    }
  };

  const progress = getWorkflowProgress(currentStatus);
  const statusColor = WORKFLOW_STATUS_COLORS[currentStatus];

  // Compact view (for list items)
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge color={statusColor} size="sm">
          {STATUS_ICONS[currentStatus]}
          <span className="ml-1">{WORKFLOW_STATUS_LABELS[currentStatus]}</span>
        </Badge>
        {availableTransitions.length > 0 && (
          <button
            onClick={() => handleTransitionClick(availableTransitions[0])}
            disabled={transitioning}
            className="text-xs text-accent-purple hover:text-accent-purple/80 flex items-center gap-1"
          >
            {transitioning ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <ChevronRight className="w-3 h-3" />
                {availableTransitions[0].action}
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  // Full view
  return (
    <div className="bg-surface-primary border border-border-secondary rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-accent-${statusColor}/10`}>
            {STATUS_ICONS[currentStatus]}
          </div>
          <div>
            <div className="text-sm text-text-secondary">Case {caseNumber}</div>
            <div className="text-lg font-semibold text-text-primary">
              {WORKFLOW_STATUS_LABELS[currentStatus]}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors"
            title="View History"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={loadWorkflowInfo}
            disabled={loading}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-text-tertiary mb-1">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-surface-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-purple rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="flex items-center justify-between mb-4 overflow-x-auto pb-2">
        {WORKFLOW_ORDER.map((status, index) => {
          const isActive = status === currentStatus;
          const isPast = WORKFLOW_ORDER.indexOf(currentStatus) > index;
          const isFuture = WORKFLOW_ORDER.indexOf(currentStatus) < index;
          
          return (
            <div key={status} className="flex items-center">
              <div
                className={`
                  flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium
                  ${isActive ? 'bg-accent-purple text-white' : ''}
                  ${isPast ? 'bg-accent-green/20 text-accent-green' : ''}
                  ${isFuture ? 'bg-surface-tertiary text-text-tertiary' : ''}
                `}
                title={WORKFLOW_STATUS_LABELS[status]}
              >
                {isPast ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              {index < WORKFLOW_ORDER.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-1 ${
                    isPast ? 'bg-accent-green' : 'bg-surface-tertiary'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Available Actions */}
      {availableTransitions.length > 0 && (
        <div className="border-t border-border-secondary pt-4">
          <div className="text-xs text-text-tertiary mb-2">Available Actions</div>
          <div className="flex flex-wrap gap-2">
            {availableTransitions.map((transition) => (
              <Button
                key={transition.targetStatus}
                variant={transition.targetStatus === 'DATA_ENTRY' || transition.targetStatus === 'MEDICAL_REVIEW' ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => handleTransitionClick(transition)}
                disabled={transitioning}
              >
                {transitioning ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ChevronRight className="w-4 h-4 mr-1" />
                )}
                {transition.action}
              </Button>
            ))}
          </div>
          {availableTransitions.some(t => t.validationRequired) && (
            <div className="flex items-center gap-1 mt-2 text-xs text-text-tertiary">
              <AlertCircle className="w-3 h-3" />
              Some actions require case validation
            </div>
          )}
        </div>
      )}

      {/* Comment Modal */}
      <Modal
        isOpen={showCommentModal}
        onClose={() => {
          setShowCommentModal(false);
          setPendingTransition(null);
          setComment('');
        }}
        title={pendingTransition?.action || 'Add Comment'}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            {pendingTransition?.description}
          </p>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Comment <span className="text-accent-red">*</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-surface-secondary border border-border-secondary rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-purple"
              placeholder="Enter reason for this action..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCommentModal(false);
                setPendingTransition(null);
                setComment('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!comment.trim() || transitioning}
              onClick={() => pendingTransition && executeTransition(pendingTransition, comment)}
            >
              {transitioning ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <MessageSquare className="w-4 h-4 mr-2" />
              )}
              Confirm
            </Button>
          </div>
        </div>
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title="Workflow History"
        size="md"
      >
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {history.length === 0 ? (
            <div className="text-center py-8 text-text-tertiary">
              <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No workflow history yet</p>
            </div>
          ) : (
            history.slice().reverse().map((entry) => (
              <div
                key={entry.id}
                className="p-3 bg-surface-secondary rounded-lg border border-border-secondary"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-text-primary text-sm">
                    {entry.action}
                  </div>
                  <div className="text-xs text-text-tertiary">
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <Badge color={WORKFLOW_STATUS_COLORS[entry.fromStatus]} size="sm">
                    {WORKFLOW_STATUS_LABELS[entry.fromStatus]}
                  </Badge>
                  <ChevronRight className="w-3 h-3" />
                  <Badge color={WORKFLOW_STATUS_COLORS[entry.toStatus]} size="sm">
                    {WORKFLOW_STATUS_LABELS[entry.toStatus]}
                  </Badge>
                </div>
                <div className="text-xs text-text-tertiary mt-1">
                  by {entry.performedByName}
                </div>
                {entry.comment && (
                  <div className="mt-2 p-2 bg-surface-primary rounded text-xs text-text-secondary">
                    "{entry.comment}"
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}

// =============================================================================
// WORKFLOW BADGE (for tables/lists)
// =============================================================================

interface WorkflowBadgeProps {
  status: ICSRWorkflowStatus | string;
  showIcon?: boolean;
}

export function WorkflowBadge({ status, showIcon = true }: WorkflowBadgeProps) {
  const workflowStatus = status as ICSRWorkflowStatus;
  const color = WORKFLOW_STATUS_COLORS[workflowStatus] || 'gray';
  const label = WORKFLOW_STATUS_LABELS[workflowStatus] || status;
  const icon = STATUS_ICONS[workflowStatus];

  return (
    <Badge color={color} size="sm">
      {showIcon && icon}
      <span className={showIcon ? 'ml-1' : ''}>{label}</span>
    </Badge>
  );
}

// =============================================================================
// WORKFLOW PROGRESS BAR (minimal)
// =============================================================================

interface WorkflowProgressProps {
  status: ICSRWorkflowStatus | string;
}

export function WorkflowProgress({ status }: WorkflowProgressProps) {
  const workflowStatus = status as ICSRWorkflowStatus;
  const progress = getWorkflowProgress(workflowStatus);

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
        <div
          className="h-full bg-accent-purple rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs text-text-tertiary w-8">{progress}%</span>
    </div>
  );
}

export default WorkflowStatus;
