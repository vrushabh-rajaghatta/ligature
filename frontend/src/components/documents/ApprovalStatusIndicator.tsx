// ApprovalStatusIndicator Component - Phase 2.3e.5 Chunk B
// Compact status indicator for document lists and headers
// v0.13.52


import { useMemo } from 'react';
import {
  CheckCircle, XCircle, Clock, AlertTriangle, Play,
  Shield, Timer, AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { ApprovalRequest, ApprovalRequestStatus } from '@/types/approval';

// ============================================================================
// PROPS & TYPES
// ============================================================================

export interface ApprovalStatusIndicatorProps {
  /** The approval request to display */
  request: ApprovalRequest | null;
  /** Display variant */
  variant?: 'badge' | 'inline' | 'minimal';
  /** Show progress (e.g., "2/4") */
  showProgress?: boolean;
  /** Show escalation warning */
  showEscalation?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// STATUS CONFIGURATION
// ============================================================================

const STATUS_CONFIG: Record<ApprovalRequestStatus, {
  label: string;
  shortLabel: string;
  color: 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'purple';
  icon: React.ReactNode;
}> = {
  'draft': {
    label: 'Draft',
    shortLabel: 'Draft',
    color: 'gray',
    icon: <Clock className="w-3 h-3" />,
  },
  'pending': {
    label: 'Pending Approval',
    shortLabel: 'Pending',
    color: 'blue',
    icon: <Clock className="w-3 h-3" />,
  },
  'in-progress': {
    label: 'In Progress',
    shortLabel: 'In Progress',
    color: 'purple',
    icon: <Play className="w-3 h-3" />,
  },
  'revision-needed': {
    label: 'Revision Needed',
    shortLabel: 'Revision',
    color: 'amber',
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  'approved': {
    label: 'Approved',
    shortLabel: 'Approved',
    color: 'green',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  'rejected': {
    label: 'Rejected',
    shortLabel: 'Rejected',
    color: 'red',
    icon: <XCircle className="w-3 h-3" />,
  },
  'cancelled': {
    label: 'Cancelled',
    shortLabel: 'Cancelled',
    color: 'gray',
    icon: <XCircle className="w-3 h-3" />,
  },
  'expired': {
    label: 'Expired',
    shortLabel: 'Expired',
    color: 'red',
    icon: <Timer className="w-3 h-3" />,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateProgress(request: ApprovalRequest): { completed: number; total: number } {
  const completed = request.approvalSteps.filter(
    s => s.status === 'completed' || s.status === 'skipped'
  ).length;
  return { completed, total: request.approvalSteps.length };
}

function hasOverdueSteps(request: ApprovalRequest): boolean {
  return request.approvalSteps.some(s => s.isOverdue && s.status !== 'completed');
}

function getEscalationTier(request: ApprovalRequest): number | null {
  if (!request.escalationEvents || request.escalationEvents.length === 0) return null;
  const latestEvent = request.escalationEvents[request.escalationEvents.length - 1];
  return latestEvent.tier;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ApprovalStatusIndicator({
  request,
  variant = 'badge',
  showProgress = true,
  showEscalation = true,
  onClick,
  className = '',
}: ApprovalStatusIndicatorProps) {
  // No request - show nothing or placeholder
  if (!request) {
    if (variant === 'minimal') return null;
    return (
      <span className={`text-xs text-text-muted ${className}`}>
        No approval
      </span>
    );
  }

  const config = STATUS_CONFIG[request.status];
  const progress = useMemo(() => calculateProgress(request), [request]);
  const isOverdue = useMemo(() => hasOverdueSteps(request), [request]);
  const escalationTier = useMemo(() => getEscalationTier(request), [request]);

  // Minimal variant - just an icon
  if (variant === 'minimal') {
    return (
      <button
        onClick={onClick}
        className={`p-1 rounded transition-colors hover:bg-surface-elevated ${className}`}
        title={`${config?.label ?? ''}${progress.total > 0 ? ` (${progress.completed}/${progress.total})` : ''}`}
      >
        <div className={`flex items-center gap-1 ${
          config.color === 'green' ? 'text-accent-green' :
          config.color === 'amber' ? 'text-accent-amber' :
          config.color === 'red' ? 'text-accent-red' :
          config.color === 'blue' ? 'text-accent-blue' :
          config.color === 'purple' ? 'text-accent-purple' :
          'text-text-muted'
        }`}>
          {config.icon}
          {isOverdue && showEscalation && (
            <AlertCircle className="w-3 h-3 text-accent-red" />
          )}
        </div>
      </button>
    );
  }

  // Inline variant - text with optional progress
  if (variant === 'inline') {
    return (
      <button
        onClick={onClick}
        className={`flex items-center gap-1.5 text-xs transition-colors hover:opacity-80 ${className}`}
      >
        <span className={`flex items-center gap-1 ${
          config.color === 'green' ? 'text-accent-green' :
          config.color === 'amber' ? 'text-accent-amber' :
          config.color === 'red' ? 'text-accent-red' :
          config.color === 'blue' ? 'text-accent-blue' :
          config.color === 'purple' ? 'text-accent-purple' :
          'text-text-muted'
        }`}>
          {config.icon}
          <span>{config.shortLabel}</span>
        </span>
        {showProgress && progress.total > 0 && request.status !== 'approved' && request.status !== 'rejected' && (
          <span className="text-text-muted">
            ({progress.completed}/{progress.total})
          </span>
        )}
        {isOverdue && showEscalation && (
          <span className="flex items-center gap-0.5 text-accent-red">
            <AlertCircle className="w-3 h-3" />
            {escalationTier && <span className="text-[10px]">T{escalationTier}</span>}
          </span>
        )}
      </button>
    );
  }

  // Badge variant (default) - full badge with all info
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-1.5 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <Badge color={config.color} size="sm">
        <span className="flex items-center gap-1">
          {config.icon}
          {config.shortLabel}
          {showProgress && progress.total > 0 && request.status !== 'approved' && request.status !== 'rejected' && (
            <span className="opacity-75">({progress.completed}/{progress.total})</span>
          )}
        </span>
      </Badge>
      
      {isOverdue && showEscalation && (
        <Badge color="red" size="sm">
          <span className="flex items-center gap-0.5">
            <AlertCircle className="w-3 h-3" />
            {escalationTier ? `Tier ${escalationTier}` : 'Overdue'}
          </span>
        </Badge>
      )}
    </div>
  );
}

// ============================================================================
// DOCUMENT LIST INTEGRATION HELPER
// ============================================================================

/**
 * Props for integrating with document list items
 */
export interface DocumentApprovalStatusProps {
  documentId: string;
  approvalRequest: ApprovalRequest | null;
  onViewStatus?: () => void;
}

/**
 * Document list item approval status wrapper
 * Shows compact indicator suitable for list rows
 */
export function DocumentApprovalStatus({
  documentId,
  approvalRequest,
  onViewStatus,
}: DocumentApprovalStatusProps) {
  if (!approvalRequest) return null;

  return (
    <ApprovalStatusIndicator
      request={approvalRequest}
      variant="inline"
      showProgress={true}
      showEscalation={true}
      onClick={onViewStatus}
    />
  );
}

export default ApprovalStatusIndicator;
