
// ApproverCard Component - Phase 2.3e.2
// Displays approver with availability, workload, and performance metrics


import { User, Clock, AlertCircle, CheckCircle, Calendar, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { ApproverCandidate } from '@/types/approval';
import { getWorkloadStatus, formatApprovalTime, getDelegate } from '@/data/mockApprovers';

// ============================================================================
// TYPES
// ============================================================================

interface ApproverCardProps {
  approver: ApproverCandidate;
  selected?: boolean;
  compact?: boolean;
  showDelegation?: boolean;
  onClick?: () => void;
  onSelectDelegate?: (delegate: ApproverCandidate) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ApproverCard({
  approver,
  selected = false,
  compact = false,
  showDelegation = true,
  onClick,
  onSelectDelegate,
}: ApproverCardProps) {
  const workloadStatus = getWorkloadStatus(approver.pendingApprovals);
  const delegate = showDelegation && !approver.isAvailable ? getDelegate(approver) : undefined;

  // Format out-of-office date
  const oooDate = approver.outOfOfficeUntil
    ? new Date(approver.outOfOfficeUntil).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={`
          flex items-center gap-3 p-2 rounded-lg border transition-all
          ${onClick ? 'cursor-pointer hover:border-accent-primary/50' : ''}
          ${selected 
            ? 'border-accent-primary bg-accent-primary/5' 
            : 'border-border bg-surface-card'}
        `}
      >
        {/* Avatar */}
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center flex-none
          ${approver.isAvailable ? 'bg-accent-primary/10' : 'bg-surface-elevated'}
        `}>
          <User className={`w-4 h-4 ${approver.isAvailable ? 'text-accent-primary' : 'text-text-muted'}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary truncate">
              {approver.userName}
            </span>
            <AvailabilityDot available={approver.isAvailable} />
          </div>
          <p className="text-xs text-text-muted truncate">{approver.title}</p>
        </div>

        {/* Workload */}
        <WorkloadBadge count={approver.pendingApprovals} status={workloadStatus} />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`
        p-4 rounded-lg border transition-all
        ${onClick ? 'cursor-pointer hover:border-accent-primary/50 hover:shadow-sm' : ''}
        ${selected 
          ? 'border-accent-primary bg-accent-primary/5 ring-1 ring-accent-primary/20' 
          : 'border-border bg-surface-card'}
      `}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center flex-none
          ${approver.isAvailable ? 'bg-accent-primary/10' : 'bg-surface-elevated'}
        `}>
          <User className={`w-5 h-5 ${approver.isAvailable ? 'text-accent-primary' : 'text-text-muted'}`} />
        </div>

        {/* Name & Title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-text-primary truncate">
              {approver.userName}
            </h4>
            <AvailabilityDot available={approver.isAvailable} />
          </div>
          <p className="text-xs text-text-muted truncate">{approver.title}</p>
          <p className="text-xs text-text-muted">{approver.department}</p>
        </div>

        {/* Selected indicator */}
        {selected && (
          <CheckCircle className="w-5 h-5 text-accent-primary flex-none" />
        )}
      </div>

      {/* Out of Office Warning */}
      {!approver.isAvailable && oooDate && (
        <div className="mt-3 p-2 bg-status-warning/10 border border-status-warning/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-status-warning flex-none" />
            <span className="text-xs text-status-warning">
              Out of office until {oooDate}
            </span>
          </div>
          
          {/* Delegation suggestion */}
          {delegate && onSelectDelegate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectDelegate(delegate);
              }}
              className="mt-2 flex items-center gap-2 text-xs text-accent-primary hover:underline"
            >
              <ArrowRight className="w-3 h-3" />
              Delegate to {delegate.userName}
            </button>
          )}
        </div>
      )}

      {/* Metrics */}
      <div className="mt-3 flex items-center gap-4">
        {/* Workload */}
        <div className="flex items-center gap-1.5">
          <WorkloadBadge count={approver.pendingApprovals} status={workloadStatus} />
          <span className="text-xs text-text-muted">pending</span>
        </div>

        {/* Response time */}
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-xs text-text-muted">
            {formatApprovalTime(approver.avgApprovalTimeHours)}
          </span>
        </div>

        {/* Accuracy */}
        <div className="flex items-center gap-1.5">
          <CheckCircle className="w-3.5 h-3.5 text-status-success" />
          <span className="text-xs text-text-muted">
            {approver.approvalAccuracy}%
          </span>
        </div>
      </div>

      {/* Qualifications (if space) */}
      {approver.qualifications.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {approver.qualifications.slice(0, 3).map((qual, idx) => (
            <Badge key={idx} variant="soft" color="gray" size="sm">
              {qual}
            </Badge>
          ))}
          {approver.qualifications.length > 3 && (
            <Badge variant="soft" color="gray" size="sm">
              +{approver.qualifications.length - 3}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface AvailabilityDotProps {
  available: boolean;
}

function AvailabilityDot({ available }: AvailabilityDotProps) {
  return (
    <div
      className={`
        w-2 h-2 rounded-full flex-none
        ${available ? 'bg-status-success' : 'bg-status-warning'}
      `}
      title={available ? 'Available' : 'Out of office'}
    />
  );
}

interface WorkloadBadgeProps {
  count: number;
  status: 'low' | 'medium' | 'high';
}

function WorkloadBadge({ count, status }: WorkloadBadgeProps) {
  const colorClass = {
    low: 'bg-status-success/10 text-status-success border-status-success/30',
    medium: 'bg-status-warning/10 text-status-warning border-status-warning/30',
    high: 'bg-status-error/10 text-status-error border-status-error/30',
  }[status];

  return (
    <span className={`
      inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border
      ${colorClass}
    `}>
      {count}
    </span>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { ApproverCardProps };
